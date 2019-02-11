---
Title:  METEOR-WEB3-API
Author: Sooyoung Hyun
Date:   February 2019
Mail:   hyunsy822@gmail.com
File:   README
---

METEOR-WEB3-API
===

## What does this project do?

METEOR-WEB3-API for Ether Transaction

## How to set it up?

Clone this repository and set up npm.
```
$ git clone https://github.com/hsy822/meteor-api.git
$ cd meteor-api/
$ meteor npm install
``` 

You need settings.json file in root directory of project look like this : 
```
{
    "env": {
        "TOKEN_KEY": token key,
        "GETH": ip address,
        "COINBASE_PW": accounts[0]'s password
    }
}
```

Run meteor
``` 
$ meteor --settings .\settings.json
``` 

Go to [http//localhost:3000](http://localhost:3000/) 

---
