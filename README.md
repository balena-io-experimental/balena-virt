<img src="https://raw.githubusercontent.com/balena-labs-research/balena-virt/logo.svg" alt="Labs Logo" title="Labs Logo" width="50"/>

# Balena Virt

Balena Virt is a suite of tools for virtualising Balena OS.

There are a number of options for using Balena Virt:

- Turning a single [Intel NUC](#balena-virt-on-intel-nuc) into a small fleet of devices for testing and development
- Running on a [Digital Ocean Droplet](#balena-virt-on-digital-ocean), providing an easy way to try [Balena Cloud](https://www.balena.io/cloud/) without the need for physical hardware, and to provide a powerful development platform.
- Using the [Balena Virt CLI](#balena-virt-cli) for custom builds

## Balena Virt on Intel NUC

[Install Balena OS on your NUC](https://www.balena.io/docs/learn/getting-started/intel-nuc/nodejs/#provision-device) using the `generic-amd64` image.

Deploy Balena Virt with the one-click install to turn your NUC into 4 Balena OS devices:

[![deploy button](https://balena.io/deploy.svg)](https://github.com/balena-labs-research/balena-virt)

By default the cores, memory and disk will mirror your NUC. To set them manually, add environment variables:

```
CORES=4
DISK=8G
MEM=512M
```

Change the default number of devices by adding or removing containers from the `./docker-compose.yml` file and deploying manually with `balena push`.

### Accessing the devices

Each device will be assigned its own IP and is accessible when you SSH to the Intel NUC.

Alternatively, you can use [Tailscale](http://tailscale.com) to expose all the running devices to your local system as if they are on your network. On the Intel NUC run the Tailscale container:

```
balena run -d \
    --name=tailscaled \
    --restart always \
    -e TS_STATE_DIR=/var/lib/tailscale \
    -v tailscale-state:/var/lib/tailscale \
    -v /dev/net/tun:/dev/net/tun \
    --network=host \
    --privileged \
    tailscale/tailscale tailscaled --advertise-routes=10.0.3.0/24 --accept-routes
```

Then bring up the service with:

```
balena exec tailscaled tailscale up
```

The Tailscale container will provide you a URL to access that adds the device to your Tailscale account.

Then [enable the subnets](https://tailscale.com/kb/1019/subnets/#step-3-enable-subnet-routes-from-the-admin-console) from your Tailscale admin panel to be able to use all the devices locally through the IP addresses they are assigned by Balena Virt.

If you would rather not use Tailscale, you can use SSH to forward a virtualised device to a port on your local system:

```
ssh -L 22222:10.0.3.10:22222 \
 -L 2375:10.0.3.10:2375 \
 -L 48484:10.0.3.10:48484 \
 root@ip.ip.ip.ip
```

## Balena Virt on Digital Ocean

Balena Virt can be run on a Digital Ocean droplet with hardware acceleration. This guide provides a link for $200 of free Digital Ocean credit; an installation script; and steps to forward the ports locally. After installation, you will be able to use virtualised OS locally just like any other device, using the Balena tools, e.g:

```
balena ssh 127.0.0.1
balena push 127.0.0.1
```

You can scale the Digital Ocean hardware to your development needs. 8 CPUs, 16GB of memory, and SSD drives make development (such as compiling binaries) far more efficient on Digital Ocean than on much of the IoT hardware used in production, while removing any need for manual configuration of development environments on your local system.

You can see [some benchmarks](./vps/README.md#benchmarks) where we compared the performance of Balena Virt on a Droplets against some common hardware.

### Step 1: Sign up for Digital Ocean and claim the free credit

Sign up for Digital Ocean. Using the button below you will get $200 of free credit for 60 days; plenty to run a powerful virtual device:

<a href="https://www.digitalocean.com/?refcode=c1582aebbcdf&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge"><img src="https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%202.svg" alt="DigitalOcean Referral Badge" /></a>

You will see a banner at the top of the page indicating that the credit is active and you can continue to the sign up page:

`Free credit active: Get started on DigitalOcean with a $200, 60-day credit for new users.`

### Step 2: Create a droplet.

The [Digital Ocean documentation](https://docs.digitalocean.com/products/droplets/how-to/create/#create-a-droplet-in-the-control-panel) provides guidance on how if you need some helps.

We suggest a minimum of 2GB of RAM. Although as your free credit only lasts 60 days, why not fire up a more powerful machine (don't forget to `destroy` the machine before your 2 months runs out):

```
8 CPUs
16 GB Memory
320 GB SSD Disk
6 TB transfer
$96 /mo
```

### Step 3: Run the install script

Connect to your Droplet as the `root` user via the terminal and run the install script:

```
curl -fsSL https://raw.githubusercontent.com/balena-labs-research/balena-virt/main/vps/install.sh | sudo sh
```

The default number cores, disk size and memory of the virtualised device will mirror the system that Balena Virt is running on.

### Step 4: Forward the Droplet ports to your local system

Mount the running virtualised OS locally with the following, where `ip.ip.ip.ip` is the IP address of your remote host (for example your DigitalOcean Droplet IP):

```
ssh -L 22222:10.0.3.10:22222 \
 -L 2375:10.0.3.10:2375 \
 -L 48484:10.0.3.10:48484 \
 root@ip.ip.ip.ip
```

You can then use the Balena CLI to interact with the OS by using the local IP address, for example:

```
balena ssh 127.0.0.1
balena push 127.0.0.1
```

Other ports can me mapped locally, for example to interact with services on the device:

```
ssh -L 80:10.0.3.10:80 \
 root@ip.ip.ip.ip
```

### Advanced Configuration

Advanced documentation is available in the `vps` folder [here](vps/README.md).

## Balena Virt CLI

Easily run virtual machines on balenaOS with native performance, powered by QEMU and KVM. Guests can even run balenaOS on balenaOS, allowing multiple containerized applications to run concurrently on one physical hardware device.

Additionally, this allows balenaOS guests to take advantage of QEMU features such as shared backing images and disk [snapshots](https://wiki.qemu.org/Documentation/CreateSnapshot) via qcow2 images, rolling back to a previous snapshot, temporary snapshots, [pause and resume](https://qemu-project.gitlab.io/qemu/system/images.html#vm-005fsnapshots), and [live migration](https://developers.redhat.com/blog/2015/03/24/live-migrating-qemu-kvm-virtual-machines) to another host.

Deploy with `balena push` from the `./cli` directory.

Grab a balenaOS image for your guest(s) using the dashboard, or CLI:

```
$ balena os download genericx86-64-ext -o rootfs.img
```

Images and configs can be copied to the named data volume for the application using SCP, assuming you have SSH access:

```
$ scp -P 22222 rootfs.img root@mydevice.local:/var/lib/docker/volumes/${appid}_resin-data/_data/
```

The config can be edited on your device from the dashboard inside the `main` container, or using SSH:

```
$ balena ssh mydevice.local main
~ # vi /data/guests.yml
```

This disk image would then be available inside the container at `/data/rootfs.img`.

### Advanced Configuration

Advanced documentation is available in the `cli` folder [here](cli/README.md).
