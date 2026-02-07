.PHONY: setup run run-date test clean fetch-only test-connection

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

setup:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

run:
	$(PYTHON) -m src.main

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
