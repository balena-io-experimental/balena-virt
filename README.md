# Nested balenaOS
Run balenaOS on balenaOS, using QEMU and KVM acceleration where available. This allows one machine to run several virtualized instances, which all show up independently on the network and the dashboard. This allows multiple containerized applications to run concurrently on one physical device. It also means balenaOS guests can take advantage of QEMU features such as shared backing images, disk snapshots, rolling back to a previous snapshot, pause and resume, and live migration to another host.

# Caveats

Because instances are virtualized, applications on separate guests must communicate between each other over the network, rather than using UNIX domain sockets or shared memory. Hardware access will typically require an IOMMU and VFIO passthrough to work, which is traditionally only supported on PCs. Your mileage may vary. This approach is most useful for running multiple services on the same physical machine, which don't require anything more than network access.

## Installation and Usage

Install dependencies using `npm i`, then run with `node index.js`

Additional dependencies are QEMU, and optionally OVMF/AAVMF firmware for UEFI support.

## Configuration

Guests are defined using a `guests.yml` YAML config.  By default, the application looks for this file in the current directly, but the path can be specified as the environment variable `GUEST_CONFIG_PATH`. The `templates` array specifies machine configuration templates that can be used to launch fleets. Template variables correlate directly to QEMU command line arguments for the most part, with few exceptions. Notably, the `append` array can be used to add arguments to the command line directly.

Variable substitution is also supported in templates, using double curly brace (`{{var}}`) syntax. Currently, the `guestId` variable can be substituted, to identify machine specific resources, such as disk, and logs.

The `guests` array specifies which templates to use, and how many instances to launch per template.

See `guests.example.yml` for details.

## Disk Configuration
As mentioned above, templates support variable substitution for identifying resources that aren't shared  between machines. For example, a a disk can be specified like so:
```yaml
drives:
  - if: virtio
    format: raw
    file: guest{{guestId}}.img
    index: 0
    media: disk
```

A fleet of five devices would then require `guest0.img` through `guest4.img` to be present.

It should be noted that raw images lack many features of other image formats, such as qcow2. We can use a qcow2 image as a backing store, and have our instances write to copy-on-write (CoW) snapshots to save disk space.

A raw image can be converted to qcow2 like so:
`qemu-img convert -f raw -O qcow2 rootfs.img rootfs.qcow2`

After converting our raw image to qcow2, we can create additional CoW snapshot images using the original as a backing store:

```bash
for i in {0..4}; do \
qemu-img create -f qcow2 -F qcow2 -b rootfs.qcow2 guest${i}.qcow2 \
done
```

These CoW snapshots can now be used directly by guests:
```yaml
drives:
  - if: virtio
    format: qcow2
    file: guest{{guestId}}.qcow2
    index: 0
    media: disk
```
