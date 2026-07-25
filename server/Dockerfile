ARG GO_VERSION=1.23-alpine
ARG BINARY=vaultpapi
ARG PORT=8080

FROM golang:${GO_VERSION} AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o ${BINARY} ./cmd/${BINARY}

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/${BINARY} .
COPY --from=builder /app/config.yaml .
COPY --from=builder /app/migrations ./migrations

EXPOSE ${PORT}

ENTRYPOINT ["./${BINARY}"]
