FROM alpine:3.15.0@sha256:c74f1b1166784193ea6c8f9440263b9be6cae07dfe35e32a5df7a31358ac2060 AS base

RUN apk add --update --no-cache \
	nodejs~=16 \
	qemu-img \
	qemu-system-x86_64 \
	qemu-system-aarch64 \
	qemu-system-arm

WORKDIR /root

RUN apk add --no-cache \
	bash \
	curl \
	docker-cli \
	jq \
	minicom \
	netcat-openbsd \
	openssh-client \
	qemu-img \
	qemu-system-x86_64 \
	unzip \
	wget \
	&& apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.11/main \
	procmail


# --- build
FROM base AS build

RUN apk add --no-cache -t .build-deps \
    build-base \
    git \
    linux-headers \
    python3

COPY run-tests.sh package*.json *.js ./

RUN npm i && apk del --purge .build-deps


# --- runtime
FROM base AS run

WORKDIR /data/

COPY --from=build /root/ /root/

COPY *.yml ./

COPY docker-hc balena.sh /usr/sbin/

RUN ln -sf /root/node_modules/balena-cli/bin/balena /usr/bin/balena

# create qemu-bridge-helper ACL file
# https://wiki.qemu.org/Features/HelperNetworking
RUN mkdir -p /etc/qemu \
	&& echo "allow all" > /etc/qemu/bridge.conf \
	&& chmod 0640 /etc/qemu/bridge.conf \
	&& addgroup root qemu \
	&& addgroup root kvm

CMD /root/cli.js
