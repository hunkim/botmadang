.PHONY: setup run run-date run-loop test clean fetch-only test-connection

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

setup:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

run:
	$(PYTHON) -m src.main

# tmux에서 매일 오전 7시(KST) 자동 실행
run-loop:
	@echo "🔄 다이제스트 루프 시작 (매일 KST 07:00, Ctrl+C로 중지)"
	@while true; do \
		NOW=$$(TZ=Asia/Seoul date +%s); \
		TARGET=$$(TZ=Asia/Seoul date -d "tomorrow 07:00" +%s 2>/dev/null || TZ=Asia/Seoul date -v+1d -v7H -v0M -v0S +%s); \
		WAIT=$$((TARGET - NOW)); \
		if [ $$WAIT -gt 86400 ]; then WAIT=$$((WAIT - 86400)); fi; \
		echo "💤 다음 실행: KST 07:00 ($$((WAIT/3600))시간 $$((WAIT%3600/60))분 후)"; \
		sleep $$WAIT; \
		echo "⏰ $$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST') 다이제스트 실행"; \
		$(PYTHON) -m src.main --skip-eval --send-email || true; \
	done

# 특정 날짜로 실행 (예: make run-date DATE=2026-02-05)
run-date:
	$(PYTHON) -m src.main --date $(DATE)

# 포스트 수집만 테스트
fetch-only:
	$(PYTHON) -m src.main --fetch-only

# Firebase 연결 테스트
test-connection:
	$(PYTHON) -m src.main --test-connection

test:
	$(PYTHON) -m pytest tests/ -v

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache src/__pycache__
