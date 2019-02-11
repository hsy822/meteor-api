import {
  Meteor
} from 'meteor/meteor';
import {
  Mongo
} from 'meteor/mongo';
import Web3 from 'web3'

const Accounts = new Mongo.Collection('accounts')
const Users = new Mongo.Collection('users')

const DEBUG = true

const provider = new Web3.providers.HttpProvider(
  Meteor.settings.env.GETH 
)
const web3 = new Web3(provider)

const version = web3.version
if (DEBUG) console.log("version: " + version) // "1.0.0-beta.40" newAccount 에러 발생 -> "1.0.0-beta.34"

//Token
const jwt = require('jsonwebtoken')
const tokenKey = Meteor.settings.env.TOKEN_KEY;

//TimeZone
const moment = require('moment-timezone')
//var currDate = moment().tz("Asia/Seoul").format();
moment.tz.setDefault("Asia/Seoul")

//callback
const bound = Meteor.bindEnvironment((callback) => {
  callback()
})

//coinBase
let coinBase

Meteor.startup(() => {
  // code to run on server at startup
  web3.eth.getCoinbase()
    .then((coinbase) => {
      coinBase = coinbase
    });
});

// 전체 사용자 account, balance 조회
Router.route('/users', {
    where: 'server'
  })
  .get(function () {
    let self = this
    let array = []

    web3.eth.getAccounts()
      .then(async (result) => {
        for (let i = 0; i < result.length; i++) {
          await web3.eth.getBalance(result[i])
            .then((balanceWei) =>
              parseFloat(web3.utils.fromWei(balanceWei, "ether"))
            )
            .then((balance) => {
              array.push({
                'address': result[i],
                'balance': balance
              })
              if (result.length === i + 1) {
                self.response.setHeader('Content-Type', 'application/json')
                self.response.end(JSON.stringify(array))
              }
            })
        }
      })
      .catch((err) => {
        console.log(err)
      })

  })

// 토큰 생성
Router.route('/users/tokennew', {
    where: 'server'
  })
  .post(function () {
    let response
    let yourName = this.request.body.userName
    let yourPass = this.request.body.userPassword
    let yourGroup = this.request.body.userGroup
    let yourAuth = this.request.body.authentication

    if (yourName === undefined || yourPass === undefined || yourGroup === undefined || yourAuth === undefined) {
      response = {
        "result": "404",
        "message": "Please, check paramete..!!"
      }
    } else if (yourName === '' || yourPass === '' || yourGroup === '' || yourAuth === '') {
      response = {
        "result": "404",
        "message": "Please, check paramete..!!"
      }
    } else {
      if (yourAuth == 'haveaniceday') {

        if (DEBUG) console.log('userPassword: ' + this.request.body.userPassword);
        if (DEBUG) console.log('yourGroup: ' + this.request.body.userGroup);

        var payLoad = {
          "userName": yourName,
          "userPassword": yourPass
        }

        var token = jwt.sign(payLoad, tokenKey, {
          algorithm: 'HS256', //"HS256", "HS384", "HS512", "RS256", "RS384", "RS512" default SHA256
          expiresIn: 604800 // 604800  // 1 week   1440 (24*60) //expires in 24 hours
        })

        if (DEBUG) console.log("token : ", token)

        var now = moment().format('YYYY/MM/DD/ HH:mm:ss')
        if (DEBUG) console.log('now: ' + now)

        var findone = Users.findOne({
          userName: yourName
        });

        if (findone === undefined) {
          Users.insert({
            userName: yourName,
            userPassword: yourPass,
            userToken: token,
            userGroup: yourGroup,
            createAt: now
          }, function (error, result) {
            if (error) {
              throw new Meteor.Error('error', 'reason for error');
            } //reported on server console only
          })

          response = {
            "result": "200",
            "message": "newToken",
            "token": token,
            "Group": yourGroup,
            "createAt": now
          }
          if (DEBUG) console.log("response: " + JSON.stringify(response))
        } else {
          response = {
            "result": "100",
            "message": "ID already exists"
          }
        }
      } else {
        response = {
          "result": "404",
          "message": "authentication false"
        }
      }
    }
    this.response.setHeader('Content-Type', 'application/json')
    this.response.end(JSON.stringify(response))
  })

// 계정 생성
Router.route('/users/accountnew', {
    where: 'server'
  })
  .post(function () {
    let response
    let self = this

    if (DEBUG) console.log('userName: ' + this.request.body.userName)

    let yourName = this.request.body.userName;
    let yourPass = this.request.body.userPassword;
    let yourTokenkey = this.request.body.userTokenkey;

    if (yourName === undefined || yourPass === undefined || yourTokenkey === undefined) {

      response = {
        "result": "404",
        "message": "Please, input the name or pass !!"
      }
    } else {

      let findone = Users.findOne({
        userName: yourName
      })

      if (findone === undefined) {
        response = {
          "result": "404",
          "message": "No user... !!"
        }
        this.response.setHeader('Content-Type', 'application/json')
        this.response.end(JSON.stringify(response))
        return
      } else if (findone.userName !== yourName && findone.userToken !== yourTokenkey) {

        if (DEBUG) {
          console.log("findone : ", findone.userName);
          console.log("findtoken : ", findone.userToken);
        }

        response = {
          "result": "404",
          "message": "No user... !!"
        }
        this.response.setHeader('Content-Type', 'application/json');
        this.response.end(JSON.stringify(response));
        return
      }

      let accountCount = Accounts.find({
        userName: yourName
      }).fetch()

      if (accountCount.length > 2) {
        response = {
          "result": "150",
          "message": "Maximum account's count is 3"
        }
        this.response.setHeader('Content-Type', 'application/json');
        this.response.end(JSON.stringify(response))
        return
      } else {

        let decoded = jwt.verify(yourTokenkey, tokenKey)
        if (DEBUG) console.log("async : ", decoded)

        let newAccount = ""
        let balance = ""
        let nowtime = ""
        let self = this
        console.log(yourPass)
        web3.eth.personal.unlockAccount(coinBase, Meteor.settings.env.COINBASE_PW)
          .then((result) => {
            if (result) {
              web3.eth.personal.newAccount(yourPass)
                .then((newAccount) => {
                  web3.eth.sendTransaction({
                      from: coinBase,
                      to: newAccount,
                      value: web3.utils.toWei('5', "ether"),
                      gasPrice: "20000000000",
                      gas: "21000"
                    })
                    .on('transactionHash', function (hash) {
                      console.log("hash", hash)
                    })
                    .on('receipt', function (receipt) {
                      console.log("receipt", receipt)
                    })
                    .on('error', console.error)
                    .on('confirmation', function (confirmationNumber, receipt) {
                      console.log("confirmationNumber", confirmationNumber)
                    })
                    .then(function (result) {
                      console.log(result)
                      web3.eth.getBalance(newAccount)
                        .then((balanceWei) => {
                          nowtime = moment().format('YYYY/MM/DD/ HH:mm:ss')
                          response = {
                            "result": "200",
                            "message": "newAccount",
                            "token": yourTokenkey,
                            "account": newAccount,
                            "balance": parseFloat(web3.utils.fromWei(balanceWei, 'ether')),
                            "createAt": nowtime
                          }

                          Accounts.insert({
                            userName: yourName,
                            userPassword: yourPass,
                            userToken: yourTokenkey,
                            newAccount: newAccount,
                            createAt: nowtime
                          }, function (error, result) {
                            if (error) {
                              throw new Meteor.Error('error', 'reason for error')
                            } //reported on server console only
                          })
                        })
                        .then(() => {
                          console.log("Return response : ", response)
                          self.response.setHeader('Content-Type', 'application/json')
                          self.response.end(JSON.stringify(response))
                        })
                    })
                })
                .catch((err) => {
                  if (DEBUG) console.log(err)
                  response = {
                    "result": "404",
                    "message": "wrong password..!!"
                  }
                  if (DEBUG) console.log("Return response : ", response)
                  self.response.setHeader('Content-Type', 'application/json')
                  self.response.end(JSON.stringify(response))
                })
            }
          })
          .catch((error) => {
            console.error(error)
          })
      }
    }
  })

Router.route('/users/send', {
    where: 'server'
  })
  .post(function () {
    let self = this
    let response
    let yourFrom = this.request.body.userFrom
    let yourTo = this.request.body.userTo
    let yourPass = this.request.body.userPassword
    let yourCoin = this.request.body.userCoin
    let yourTokenkey = this.request.body.userTokenkey

    if (DEBUG) console.log('userAccount: ' + yourFrom)

    if (yourFrom === undefined || yourTo === undefined || yourPass === undefined || yourCoin === undefined || yourTokenkey === undefined) {
      response = {
        "result": "404",
        "message": "Please, check paramete.. !!"
      }
    } else if (yourFrom === '' || yourTo === '' || yourPass === '' || yourCoin === '' || yourTokenkey === '') {
      response = {
        "result": "404",
        "message": "Please, input the name or pass or group !!"
      }
    } else {

      web3.eth.personal.unlockAccount(yourFrom, yourPass)
        .then((result) => {
          web3.eth.sendTransaction({
            from: yourFrom,
            to: yourTo,
            value: web3.utils.toWei(yourCoin.toString(), "ether"),
            gasPrice: "20000000000",
            gas: "21000"
          })
          .on('transactionHash', function (hash) {
            console.log("hash", hash)
          })
          .on('receipt', function (receipt) {
            console.log("receipt", receipt)
          })
          .on('error', function (error) {
            response = {
              "result": "404",
              "message": "transaction failed..!"
            }
            self.response.setHeader('Content-Type', 'application/json');
            self.response.end(JSON.stringify(response));
            return
          })
          .on('confirmation', function (confirmationNumber, receipt) {
            console.log("confirmationNumber", confirmationNumber)
          })
          .then(function (result) {
            console.log(result)
            response = {
              "result": "200",
              "message": "transaction success..!"
            }
            self.response.setHeader('Content-Type', 'application/json');
            self.response.end(JSON.stringify(response));
          })
        })
        .catch((error) => {
          console.error(error)
          response = {
            "result": "404",
            "message": "wrong password...!!!"
          }
          self.response.setHeader('Content-Type', 'application/json')
          self.response.end(JSON.stringify(response))
          return
        })
    }
  });