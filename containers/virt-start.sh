#!/usr/bin/env bash
IMAGE_PATH="https://api.balena-cloud.com/download?deviceType=generic-amd64&fileType=.zip&developmentMode=true&imageType=raw&version="
PID_FILE="/app/pid/first.pid"
RANDOM_PORT=$((RANDOM % 9999))

# If this is the first device started, use a MAC address to set a default IP
if ! test -f "$PID_FILE"; then
    mkdir -p /app/pid
    touch "$PID_FILE"
    echo "Starting balenaVirt Machine..."
    MAC_ADDRESS="52:54:00:b9:57:b8"
else 
    echo "Starting additional balenaVirt Machine..."
    MAC_ADDRESS=$(printf '52:54:00:%02X:%02X:%02X\n' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)))
fi

# Check for hardware acceleration
if ! ls /dev/kvm &> /dev/null; then
    echo "KVM hardware acceleration unavailable. Pass --device /dev/kvm in your Docker run command."
    exit 1
fi

# If no default OS version is specified, use the latest version
if [ -z "$IMAGE_VERSION" ]; then
    IMAGE_VERSION="latest"
    echo OS Version: "$IMAGE_VERSION"
fi

# Set default cores to same as system if not specified
if [ -z "$CORES" ]; then
    CORES=$(nproc --all)
    echo Cores: "$CORES"
fi

# Set default space to same as available on system if not specified
if [ -z "$DISK" ]; then
    DISK=$(df -Ph . | tail -1 | awk '{print $4}')
    echo Disk: "$DISK"
fi

# Set default memory to same as system if not specified
if [ -z "$MEM" ]; then
    MEM=$(($(free -m | grep -oP '\d+' | head -6 | tail -1)-50))M
    echo Mem: "$MEM"
fi

# If image is not yet generated then create based on available disk space
if [ ! -f balena.qcow2 ]; then
    echo "Downloading balenaOS image..."
    wget -q -O balena-image.zip "$IMAGE_PATH$IMAGE_VERSION" && \
    unzip balena-image.zip && \
    mv ./*.img balena.img && \
    qemu-img convert -f raw -O qcow2 balena.img balena-source.qcow2 && \
    qemu-img create -f qcow2 -F qcow2 -b balena-source.qcow2 balena.qcow2 "$DISK" && \
    rm balena.img balena-image.zip
fi

# Start the VM
exec qemu-system-x86_64 \
    -nographic \
    -machine q35 \
    -accel kvm \
    -cpu max \
    -smp "$CORES" \
    -m "$MEM" \
    -bios "/usr/share/ovmf/OVMF.fd" \
    -drive if=pflash,format=raw,unit=0,file=/usr/share/OVMF/OVMF_CODE.fd \
    -drive if=virtio,format=qcow2,unit=0,file=balena.qcow2 \
    -net nic,model=virtio,macaddr="$MAC_ADDRESS" \
    -net user \
    -netdev user,id=n0,hostfwd=tcp::1$RANDOM_PORT-:22,hostfwd=tcp::2$RANDOM_PORT-:2375 \
    -netdev socket,id=vlan,mcast=230.0.0.1:1234 \
    -device virtio-net-pci,netdev=n0,mac="$MAC_ADDRESS" \
    -device virtio-net-pci,netdev=vlan,mac="$MAC_ADDRESS"
