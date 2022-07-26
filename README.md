# xmr-node-proxy

Donations are for devs (if available). Based on MoneroOcean and Snipa xmr-node-proxy.

It is advisable to fresh install. For http access, it's view-only but you can still secure access with login in config.json

## Proxy upgrade to newer version
- ~/xmr-node-proxy/update.sh or ./update.sh

## Feature
- General coin by POW algorithm ("coin" : "cryptonightv7" , "coin" : "cryptonight", "coin" : "forknote", ...)  
- Http access (http://yourIP:8181)
- Failover pools

## Special algo cases : 
- Turtlecoin --> "coin" : "trtl";
- Bittube --> "coin" : "tube";
- Masari --> "coin" : "msr";
- Stellite --> "coin" : "xtl";
- Haven --> "coin" : "xhv";

## HTTP monitoring by browser
- In config.json
  "httpEnable": true,
  "httpAddress": "0.0.0.0",
  "httpPort": "8181",
- Your proxy IP address for example is 11.22.33.44
- Monitoring your rig by browser on any devices : http://11.22.33.44:8181 (replacing 11.22.33.44 by your proxy's public Internet address)
![alt text](https://raw.githubusercontent.com/bobbieltd/xmr-node-proxy/master/xnpexample.png)

## HTTP password access
- In config.json if httpUser or httpPass is not empty, http access will be secured
  "httpUser": "admin",
  "httpPass": "admin",
  
## Balancing with backup pools
1. Specify at least one main pool with non zero share and "default: true". Sum of all non zero pool shares should be equal to 100 (percent).

2. There should be one pool with "default: true" (the last one will override previous ones with "default: true"). Default pool means pool that is used
for all initial miner connections via proxy.

3. You can use pools with zero share as backup pools. They will be only used if all non zero share pools became down.

4. You should select pool port with difficulty that is close to hashrate of all of your miners multiplied by 10.

5. Proxy ports should have difficulty close to your individual miner hashrate multiplied by 10.

## Setup Instructions

Based on a clean Ubuntu 16.04 LTS minimal install.
Very useful and thoroughful guide to setup xmr-node-proxy on free tier Amazon AWS from MO : https://moneroocean.blogspot.com/2017/10/setup-of-xmr-node-proxy-on-free-tier.html

## Deployment via Installer

1. Create a user 'nodeproxy' and assign a password (or add an SSH key. If you prefer that, you should already know how to do it)

A. If you have less than 4Gb RAM, you should add swap. Swap is used for compiling the proxy installation but for running proxy 512Mb or 1Gb is enough, very lightweight.
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

B. Adding new user
```bash
useradd -d /home/nodeproxy -m -s /bin/bash nodeproxy
passwd nodeproxy
su nodeproxy
```

2. Add your user to `/etc/sudoers`, this must be done so the script can sudo up and do it's job.  We suggest passwordless sudo.  Suggested line: `<USER> ALL=(ALL) NOPASSWD:ALL`.  Our sample builds use: `nodeproxy ALL=(ALL) NOPASSWD:ALL`

```bash
echo "nodeproxy ALL=(ALL) NOPASSWD:ALL" | sudo tee -a /etc/sudoers
```

3. Log in as the **NON-ROOT USER** you just created and run the [deploy script](https://raw.githubusercontent.com/bobbieltd/xmr-node-proxy/master/install.sh).  This is very important!  This script will install the proxy to whatever user it's running under!

```bash
curl -L https://raw.githubusercontent.com/bobbieltd/xmr-node-proxy/master/install.sh | bash
```

3. Once it's complete, copy `example_config.json` to `config.json` and edit as desired.
4. Run: `source ~/.bashrc`  This will activate NVM and get things working for the following pm2 steps.
8. Once you're happy with the settings, go ahead and start all the proxy daemon, commands follow.

```shell
cd ~/xmr-node-proxy/
pm2 start proxy.js --name=proxy --log-date-format="YYYY-MM-DD HH:mm Z"
pm2 save
```
You can check the status of your proxy by either issuing

```
pm2 log proxy
```

or using the pm2 monitor

```
pm2 monit
```

## Known Issues

VMs with 512Mb or less RAM will need some swap space in order to compile the C extensions for node.  Bignum and the CN libraries can chew through some serious memory during compile.  In regards to this, one of our users has put together a guide for T2.Micro servers: https://docs.google.com/document/d/1m8E4_pDwKuFo0TnWJaO13LDHqOmbL6YrzyR6FvzqGgU (Credit goes to MayDay30 for his work with this!)

If not running on an Ubuntu 16.04 system, please make sure your kernel is at least 3.2 or higher, as older versions will not work for this.

Many smaller VMs come with ulimits set very low. We suggest looking into setting the ulimit higher. In particular, `nofile` (Number of files open) needs to be raised for high-usage instances. Guide : http://posidev.com/blog/2009/06/04/set-ulimit-parameters-on-ubuntu/

If your system doesn't have AES-NI, then it will throw an error and utils should be changed ....

In your `packages.json`, do a `npm install`, and it should pass.


## Performance

The proxy gains a massive boost over a basic pool by accepting that the majority of the hashes submitted _will_ not be valid (does not exceed the required difficulty of the pool).  Due to this, the proxy doesn't bother with attempting to validate the hash state nor value until the share difficulty exceeds the pool difficulty.

In testing, we've seen AWS t2.micro instances take upwards of 2k connections, while t2.small taking 6k.  The proxy is extremely light weight, and while there are more features on the way, it's our goal to keep the proxy as light weight as possible.

## Configuration Guidelines

Please check the [wiki](https://github.com/Snipa22/xmr-node-proxy/wiki/config_review) for information on configuration

## Developer Donations

The proxy is pre-configured for a 1% donation. This is easily toggled inside of it's configuration. If you'd like to make a one time donation, the addresses are as follows:

* XMR - 44Ldv5GQQhP7K7t3ZBdZjkPA7Kg7dhHwk3ZM3RJqxxrecENSFx27Vq14NAMAd2HBvwEPUVVvydPRLcC69JCZDHLT2X5a4gr
* BTC - 114DGE2jmPb5CP2RGKZn6u6xtccHhZGFmM

## Installation/Configuration Assistance

If you need help installing the pool from scratch, please have your servers ready, which would be Ubuntu 16.04 servers, blank and clean, DNS records pointed.  These need to be x86_64 boxes with AES-NI Available.

Installation asstiance is 4 XMR, with a 2 XMR deposit, with remainder to be paid on completion.  
Configuration assistance is 2 XMR with a 1 XMR deposit, and includes debugging your proxy configurations, ensuring that everything is running, and tuning for your uses/needs.  

SSH access with a sudo-enabled user will be needed for installs, preferably the user that is slated to run the pool.

Please contact Snipa at: proxy_installs@snipanet.com or via IRC on irc.freenode.net in #monero-pools

## Known Working Pools

* [XMRPool.net](https://xmrpool.net)
* [supportXMR.com](https://supportxmr.com)
* [MoneroOcean.stream](https://moneroocean.stream)
* [xmr.semiPOOL.com](https://xmr.semipool.com)
* [etn.semiPOOL.com](https://etn.semipool.com)
* [aeon.semiPOOL.com](https://aeon.semipool.com)
* [grft.semiPOOL.com](https://grft.semipool.com)
* [dero.semiPOOL.com](https://dero.semipool.com)
* [sumo.semiPOOL.com](https://sumo.semipool.com)
* [krb.semiPOOL.com](https://krb.semipool.com)
* [trtl.semiPOOL.com](https://trtl.semipool.com)
* [ipbc.semiPOOL.com](https://ipbc.semipool.com)
* [itnspool.net](https://itnspool.net)

If you'd like to have your pool added, please make a pull request here, or contact Snipa on IRC!
# xmr-node-proxy
