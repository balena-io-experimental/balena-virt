# Balena Virt on Digital Ocean

For basic installation see the repo [README](../README.md).

## Advanced Configuration

### Manually start the containers

```
# Start the networking requirements
docker run -it --restart always --cap-add=net_admin --network host ghcr.io/balena-labs-research/balena-virt-networking:latest

# Start the virtualised OS
docker run -it --restart always -v bv_pid:/app/pid --device=/dev/kvm --cap-add=net_admin --network host ghcr.io/balena-labs-research/balena-virt:latest
```

### Start additional virtualised OS on the same host

After starting the `networking` container in the previous step, you can start additional instances by running the container command again:

```
docker run -it --restart always -v bv_pid:/app/pid --device=/dev/kvm --cap-add=net_admin --network host ghcr.io/balena-labs-research/balena-virt:latest
```

The second instance will be assigned a random IP address to avoid overlap with the first instance.

### Manually configure the disk size, memory and number of cores

Default cores, disk size and memory will mirror the system that it is running on (using available memory to avoid out of memory errors). Override the automatic configuration by passing environment variables during the Docker run process, for example to set the disk size:

```
docker run -it -e "DISK=32G" --restart always -v bv_pid:/app/pid --device=/dev/kvm --cap-add=net_admin --network host ghcr.io/balena-labs-research/balena-virt:latest
```

Available environment variables with examples:

```bash
# Default image is GENERIC X86_64 (GPT)
IMAGE_VERSION=2.108.28+rev3
CORES=4
DISK=8G
MEM=512M
```

## Tailscale

Tailscale is installed by the `install.sh` script automatically.

Use `tailscale up --advertise-routes=10.0.3.0/24 --accept-routes` on the VM host to start Tailscale and to detect all running devices.

Then [enable the subnets](https://tailscale.com/kb/1019/subnets/#step-3-enable-subnet-routes-from-the-admin-console) from your Tailscale admin panel to be able to use all the devices locally through the IP addresses they are assigned by Balena Virt.

# Using other VPS services

This setup should work on other VPS services (although untested). However, many services do not provide KVM support on their hardware which will prevent Balena Virt from running (or at least if you hack it to work without KVM you will get significant performance reductions).

# Benchmarks

To demonstrate some of the potential of Balena Virt on Digital Ocean, the following simple benchmarks run inside an Alpine container on a virtualised Balena OS to demonstrate a Digital Ocean Droplet against some common hardware.

For CPU tests, bogo ops/s (real-time) is the key figure to compare. For disk tests, the copied time in seconds and speed MB/s is key. On the Pi tests, we used standard $5 SD cards which were expectedly very slow.

## Raspberry Pi 3

### CPU Test

```
stress-ng --matrix 4 -t 60s --metrics-brief
stress-ng: info:  [287] stressor       bogo ops real time  usr time  sys time   bogo ops/s     bogo ops/s
stress-ng: info:  [287]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: info:  [287] matrix            51562     60.00    230.45      0.30       859.36         223.45
```

### Disk Test

```
dd if=/dev/zero of=/tmp/output conv=fdatasync bs=384k count=1k; rm -f /tmp/output
402653184 bytes (403 MB, 384 MiB) copied, 48.3945 s, 8.3 MB/s
```

## Raspberry Pi 4

### CPU Test

```
stress-ng --matrix 4 -t 60s --metrics-brief
stress-ng: info:  [366] stressor       bogo ops real time  usr time  sys time   bogo ops/s   bogo ops/s
stress-ng: info:  [366]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: info:  [366] matrix           121889     60.00    237.99      0.03      2031.33       512.10
```

### Disk Test

```
dd if=/dev/zero of=/tmp/output conv=fdatasync bs=384k count=1k; rm -f /tmp/output
402653184 bytes (403 MB, 384 MiB) copied, 21.9972 s, 18.3 MB/s
```

## 1CPU Digital Ocean Droplet

### CPU Test

```
stress-ng --matrix 4 -t 60s --metrics-brief
stress-ng: info:  [307] stressor       bogo ops real time  usr time  sys time   bogo ops/s     bogo ops/s
stress-ng: info:  [307]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: info:  [307] matrix           115322     60.01    217.77      0.56      1921.77         528.20
```

### Disk Test

```
dd if=/dev/zero of=/tmp/output conv=fdatasync bs=384k count=1k; rm -f /tmp/output
402653184 bytes (403 MB, 384 MiB) copied, 0.865463 s, 465 MB/s
```

## 8CPUS Digital Ocean Droplet :boom:

### CPU Test 1

```
stress-ng --matrix 4 -t 60s --metrics-brief
stress-ng: info:  [307] stressor       bogo ops real time  usr time  sys time   bogo ops/s     bogo ops/s
stress-ng: info:  [13]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: info:  [13] matrix           534406     60.00    239.70      0.02      8906.71        2229.29
```

### CPU Test 2 :boom:

Note that in the above only 4 workers were started to keep the test consistent across all the tests. However, this platform has 8CPUs so here is another test using all 8:

```
stress-ng --matrix 4 -t 60s --metrics-brief
stress-ng: info:  [26] stressor       bogo ops real time  usr time  sys time   bogo ops/s     bogo ops/s
stress-ng: info:  [26]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: info:  [26] matrix           974768     60.00    475.25      0.27     16245.81        2049.90
```

### Disk Test

```
dd if=/dev/zero of=/tmp/output conv=fdatasync bs=384k count=1k; rm -f /tmp/output
402653184 bytes (403 MB, 384 MiB) copied, 0.276624 s, 1.5 GB/s
```
