/**
 * Minimal in-memory stand-in for the Firestore Admin SDK, covering only what
 * the service layer uses. It counts document reads so tests can assert that
 * cached paths do not hit the database again.
 */

type Data = Record<string, unknown>;

const INCREMENT = Symbol('increment');

export const FakeFieldValue = {
    increment: (n: number) => ({ [INCREMENT]: n }),
};

function toMillis(value: unknown): unknown {
    return value instanceof Date ? value.getTime() : value;
}

function applyUpdate(target: Data, patch: Data): void {
    for (const [key, value] of Object.entries(patch)) {
        if (value && typeof value === 'object' && INCREMENT in value) {
            target[key] = ((target[key] as number) || 0) + (value as Record<symbol, number>)[INCREMENT];
        } else {
            target[key] = value;
        }
    }
}

class FakeSnapshot {
    constructor(readonly id: string, private readonly value: Data | undefined, readonly ref: FakeDocRef) {}
    get exists() { return this.value !== undefined; }
    data() { return this.value ? { ...this.value } : undefined; }
}

class FakeDocRef {
    constructor(private readonly db: FakeFirestore, private readonly collection: string, readonly id: string) {}

    private get docs() { return this.db.store(this.collection); }

    async get() {
        this.db.reads++;
        return new FakeSnapshot(this.id, this.docs.get(this.id), this);
    }
    async set(data: Data) {
        this.db.writes++;
        this.docs.set(this.id, { ...data });
    }
    async update(patch: Data) {
        const current = this.docs.get(this.id);
        if (!current) throw new Error(`NOT_FOUND: ${this.collection}/${this.id}`);
        this.db.writes++;
        applyUpdate(current, patch);
    }
    async delete() {
        this.db.writes++;
        this.docs.delete(this.id);
    }
}

type Filter = { field: string; op: string; value: unknown };

class FakeQuery {
    constructor(
        protected readonly db: FakeFirestore,
        protected readonly collection: string,
        private readonly filters: Filter[] = [],
        private readonly order: { field: string; dir: string } | null = null,
        private readonly max: number | null = null,
        private readonly after: string | null = null
    ) {}

    where(field: string, op: string, value: unknown) {
        return new FakeQuery(this.db, this.collection, [...this.filters, { field, op, value }], this.order, this.max, this.after);
    }
    orderBy(field: string, dir: string = 'asc') {
        return new FakeQuery(this.db, this.collection, this.filters, { field, dir }, this.max, this.after);
    }
    limit(max: number) {
        return new FakeQuery(this.db, this.collection, this.filters, this.order, max, this.after);
    }
    startAfter(snapshot: { id: string }) {
        return new FakeQuery(this.db, this.collection, this.filters, this.order, this.max, snapshot.id);
    }

    async get() {
        let rows = [...this.db.store(this.collection).entries()].filter(([, data]) =>
            this.filters.every(({ field, op, value }) => {
                const actual = toMillis(data[field]) as number;
                const expected = toMillis(value) as number;
                switch (op) {
                    case '==': return actual === expected;
                    case '>=': return actual >= expected;
                    case '>': return actual > expected;
                    default: throw new Error(`Unsupported operator ${op}`);
                }
            })
        );

        if (this.order) {
            const { field, dir } = this.order;
            const sign = dir === 'desc' ? -1 : 1;
            rows.sort(([, a], [, b]) => sign * ((toMillis(a[field]) as number) - (toMillis(b[field]) as number)));
        }
        if (this.after) {
            rows = rows.slice(rows.findIndex(([id]) => id === this.after) + 1);
        }
        if (this.max !== null) {
            rows = rows.slice(0, this.max);
        }

        // Firestore bills at least one read per query
        this.db.reads += Math.max(rows.length, 1);

        const docs = rows.map(([id, data]) => new FakeSnapshot(id, data, new FakeDocRef(this.db, this.collection, id)));
        return { docs, empty: docs.length === 0, size: docs.length };
    }
}

class FakeCollection extends FakeQuery {
    doc(id: string = `auto_${++this.db.autoId}`) {
        return new FakeDocRef(this.db, this.collection, id);
    }
}

export class FakeFirestore {
    reads = 0;
    writes = 0;
    autoId = 0;
    private collections = new Map<string, Map<string, Data>>();

    store(name: string): Map<string, Data> {
        let docs = this.collections.get(name);
        if (!docs) {
            docs = new Map();
            this.collections.set(name, docs);
        }
        return docs;
    }

    collection(name: string) {
        return new FakeCollection(this, name);
    }

    batch() {
        const ops: Array<() => Promise<void>> = [];
        return {
            update: (ref: FakeDocRef, patch: Data) => { ops.push(() => ref.update(patch)); },
            commit: async () => { for (const op of ops) await op(); },
        };
    }

    /** Test helpers: direct access without touching the read/write counters */
    seed(collection: string, id: string, data: Data) {
        this.store(collection).set(id, { ...data });
    }
    peek(collection: string, id: string): Data | undefined {
        return this.store(collection).get(id);
    }
    all(collection: string): Array<Data & { id: string }> {
        return [...this.store(collection).entries()].map(([id, data]) => ({ id, ...data }));
    }
    reset() {
        this.collections.clear();
        this.reads = 0;
        this.writes = 0;
        this.autoId = 0;
    }
}
