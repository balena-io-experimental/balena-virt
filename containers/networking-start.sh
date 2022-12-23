#!/usr/bin/env bash
mkdir -p /dev/net
mknod -m 666 /dev/net/tun c 10 200

socat UDP4-DATAGRAM:230.0.0.1:1234,sourceport=1234,reuseaddr,ip-add-membership=230.0.0.1:127.0.0.1 TUN:10.0.3.1/24,tun-type=tap,iff-no-pi,iff-up,tun-name=balenavirt0 &

dnsmasq --conf-file=dnsmasq.conf --leasefile-ro -d
