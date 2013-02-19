.PHONY: lint test

all: lint test

lint:
	jshint bit-buffer.js

test:
	mocha --ui tdd