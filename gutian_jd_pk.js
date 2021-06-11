/*
京享值PK
更新时间：2021-6-11
活动入口：京东APP-我的-京享值

修改为查询自己的PK好友

已支持IOS双京东账号,Node.js支持N个京东账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
 */
const $ = new Env('京享值PK');
$.toObj = (t, e = null) => {
    try {
        return JSON.parse(t)
    } catch {
        return e
    }
}
$.toStr = (t, e = null) => {
    try {
        return JSON.stringify(t)
    } catch {
        return e
    }
}
const notify = $.isNode() ? require("./sendNotify") : "";
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
let cookiesArr = [],
    cookie = "",
    message;
let noTimes = false;
let pkTimes = 1;

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item]);
    });
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === "false") console.log = () => { };
} else {
    cookiesArr = [
        $.getdata("CookieJD"),
        $.getdata("CookieJD2"),
        ...jsonParse($.getdata("CookiesJD") || "[]").map((item) => item.cookie),
    ].filter((item) => !!item);
}
// const JD_API_HOST = "https://api.m.jd.com/client.action";
// let authorPin = '';
$.helpAuthor = true;
!(async () => {
    if (!cookiesArr[0]) {
        $.msg(
            $.name,
            "【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取",
            "https://bean.m.jd.com/", {
            "open-url": "https://bean.m.jd.com/"
        }
        );
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(
                cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]
            );
            $.index = i + 1;
            message = "";
            console.log(`\n******开始【京东账号${$.index}】${$.UserName}*********\n`);
            await main()
        }
    }
})()
    .catch((e) => {
        $.log("", `❌ ${$.name}, 失败! 原因: ${e}!`, "");
    })
    .finally(() => {
        $.done();
    });

function showMsg() {
    return new Promise(resolve => {
        $.log($.name, '', `京东账号${$.index}${$.nickName}\n${message}`);
        resolve()
    })
}

async function main() {
    await getToken();
    console.log("当前token：" + $.token);
    if ($.token) {
        await getPin();
        await getLeftPKTimes();
        if ($.pin) {
            console.log("🔥我的PK码：" + $.pin);
        }
        await letsPK(); // 寻找好友去pk
        await getBoxRewardInfo(); // 查询胜场信息
        console.log("🔥去开宝箱");
        if ($.awards) {
            for (let index = 0; index < $.awards.length; index++) {
                let item = $.awards[index];
                if (item.received == 0) {
                    if ($.totalWins >= item.wins) {
                        await sendBoxReward(item.id);
                    }
                }
            }
            console.log("🔥宝箱已开完或暂无宝箱");
        }
    }
}
// 和好友PK
async function letsPK() {
    await getPinList(pkTimes); // 获取的pin列表
    let myScore = await getScore($.pin);
    console.log("🔥我的京享值:" + myScore);
    if ($.pinList && $.pinList.length > 0) {
        console.log(JSON.stringify($.pinList))
        for (let i = 0; i < $.pinList.length; i++) {
            if (noTimes) {
                break;
            } else {
                let pin = $.pinList[i].friendPin;
                let name = $.pinList[i].jdNickname;
                let fscore = await getScore(pin);
                if (fscore < myScore) {
                    console.log('🔥对手：' + name + "，京享值：" + fscore + '☑PK');
                    await launchBattle(pin);
                    if(noTimes){
                        break
                    }
                    await receiveBattle(pin);
                }else{
                    console.log('🔥对手：' + name + "，京享值：" + fscore + '，⛔不PK');
                }
            }
        }
        if(!noTimes){
            pkTimes++
            await letsPK()
        }
        noTimes = false;
    }else{
        console.log("🔥哎，你京东没有好友呀，你只能通过PK码去PK了。");
        return
    }
}
// 获取剩余PK次数
function getLeftPKTimes() {
    return new Promise((resolve) => {
        let options = {
            "url": `https://pengyougou.m.jd.com/like/jxz/getMyRankInfo?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}`,

            "headers": {
                "Host": "pengyougou.m.jd.com",
                'Origin': 'https://game-cdn.moxigame.cn',
                "Connection": "keep-alive",
                "Accept": " */*",
                'Referer': 'https://game-cdn.moxigame.cn/',
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;10.0.2;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-cn'
            }
        }

        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res).data;
                    console.log('🔥【'+ data.nickName +'】，胜局：' + data.winNum + "次，还可挑战：" + data.leftLunchPkNum + '次，还可接受挑战：'+ data.leftAcceptPkNum+ '次');
                    if(data.leftLunchPkNum==0){
                        noTimes = true
                        return
                    }
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}
// 获取JD好友pk码列表
function getPinList(page = 1) {
    return new Promise((resolve) => {
        let options = {
            "url": `https://pengyougou.m.jd.com/like/jxz/getUserFriendsPage?actId=8&pageNo=${page}&pageSize=10&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}`,

            "headers": {
                "Host": "pengyougou.m.jd.com",
                'Origin': 'https://game-cdn.moxigame.cn',
                "Connection": "keep-alive",
                "Accept": " */*",
                'Referer': 'https://game-cdn.moxigame.cn/',
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;10.0.2;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-cn'
            }
        }

        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    let friendPinData = data.datas.map(item => {
                        return {
                            friendPin: item.friendPin,
                            jdNickname: item.jdNickname
                        }
                    })
                    $.pinList = friendPinData;
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}

// 根据pin查京享值
function getScore(fpin) {
    // console.log("查询"+fpin+"分数");
    return new Promise((resolve) => {
        let options = {
            "url": "https://jd.moxigame.cn/likejxz/getScore?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=" + fpin,
            "headers": {
                "Host": "jd.moxigame.cn",
                "Content-Type": "application/json",
                "Origin": "https://game-cdn.moxigame.cn",
                "Connection": "keep-alive",
                "Accept": " */*",
                "User-Agent": "",
                "Accept-Language": "zh-cn",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }

        $.get(options, (err, resp, res) => {
            let score = 0;
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data) {
                        score = data.data;
                    }
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(score);
            }
        })
    });
}
// 发起挑战
function launchBattle(fpin) {
    console.log("🔥发起挑战");
    return new Promise((resolve) => {
        let options = {
            "url": `https://jd.moxigame.cn/likejxz/launchBattle?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}&recipient=${fpin}&relation=1`,
            "headers": {
                "Host": "jd.moxigame.cn",
                "Content-Type": "application/json",
                "Origin": "https://game-cdn.moxigame.cn",
                "Connection": "keep-alive",
                "Accept": " */*",
                "User-Agent": "",
                "Accept-Language": "zh-cn",
            }
        }

        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data) {
                        data = data.data;
                        if (data.msg) {
                            console.log(data.msg);
                            if (data.msg == "今日次数已耗尽") {
                                noTimes = true;
                            }
                        } else {
                            console.log($.toStr(data));
                        }
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}

// 开始挑战
function receiveBattle(fpin) {
    return new Promise((resolve) => {
        let options = {
            "url": `https://jd.moxigame.cn/likejxz/receiveBattle?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}&recipient=${fpin}`,
            "headers": {
                "Host": "jd.moxigame.cn",
                "Content-Type": "application/json",
                "Origin": "https://game-cdn.moxigame.cn",
                "Connection": "keep-alive",
                "Accept": " */*",
                "User-Agent": "",
                "Accept-Language": "zh-cn",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data) {
                        data = data.data;
                        console.log("挑战成功");
                        if (data.state == 1) {
                            if (data.pkResult) {
                                console.log("当前胜场:" + data.pkResult.fromWinNum);
                            }
                        } else {
                            console.log($.toStr(data));
                        }
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}
// 查询胜场信息
function getBoxRewardInfo() {
    return new Promise((resolve) => {
        let options = {
            "url": "https://pengyougou.m.jd.com/like/jxz/getBoxRewardInfo?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=" + $.pin,
            "headers": {
                "Host": "jdjoy.jd.com",
                "Origin": "https://prodev.m.jd.com",
                "Cookie": cookie,
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
                "Accept-Language": "zh-cn",
                "Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
            }
        }

        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data.success) {
                        $.awards = data.data.awards;
                        $.totalWins = data.data.totalWins;
                        console.log("总胜场:" + data.data.totalWins);
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}

// 开箱子
function sendBoxReward(rewardConfigId) {
    return new Promise((resolve) => {
        let options = {
            "url": "https://pengyougou.m.jd.com/like/jxz/sendBoxReward?rewardConfigId=" + rewardConfigId + "&actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=" + $.pin,
            "headers": {
                "Host": "jdjoy.jd.com",
                "Origin": "https://prodev.m.jd.com",
                "Cookie": cookie,
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
                "Accept-Language": "zh-cn",
                "Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
            }
        }

        $.get(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data.success) {
                        $.openAwards = data.datas;
                        if ($.openAwards) {
                            $.openAwards.forEach(item => {
                                console.log('获得奖励:' + $.toStr(item.beanNum)+'京豆');
                            });
                        }
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}
// 获取pk码
function getPin() {
    return new Promise((resolve) => {
        let options = {
            "url": "https://jdjoy.jd.com/saas/framework/encrypt/pin?appId=dafbe42d5bff9d82298e5230eb8c3f79",
            "headers": {
                "Host": "jdjoy.jd.com",
                "Origin": "https://prodev.m.jd.com",
                "Cookie": cookie,
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
                "Accept-Language": "zh-cn",
                "Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
            }
        }

        $.post(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data) {
                        $.pin = data.data
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}
// 获取token
function getToken() {
    return new Promise((resolve) => {
        let options = {
            "url": "https://jdjoy.jd.com/saas/framework/user/token?appId=dafbe42d5bff9d82298e5230eb8c3f79&client=m&url=pengyougou.m.jd.com",
            "headers": {
                "Host": "jdjoy.jd.com",
                "Origin": "https://prodev.m.jd.com",
                "Cookie": cookie,
                "Connection": "keep-alive",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
                "Accept-Language": "zh-cn",
                "Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
            }
        }
        $.post(options, (err, resp, res) => {
            try {
                if (res) {
                    let data = $.toObj(res);
                    if (data) {
                        $.token = data.data
                    }

                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve(res);
            }
        })
    });
}


function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, "", "不要在BoxJS手动复制粘贴修改cookie");
            return [];
        }
    }
}


// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}