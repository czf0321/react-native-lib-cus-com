/**
 * 基于 fetch 封装的 GET请求
 * @param url
 * @param params {}
 * @param headers
 * @returns {Promise}
 */
import {
    NetInfo,
    Platform, TextInput,
} from 'react-native';
import {Tools} from "./Tools";
import {HttpUrls} from "./HttpUrls";
import {TalkingData} from "./TalkingData";
import {Alert} from "./Alert";

import RNFS from 'react-native-fs';
/*import FileTransfer from '@remobile/react-native-file-transfer';
 // var FileTransfer = require('@remobile/react-native-file-transfer');
 var RNUploader = NativeModules.RNUploader;*/

import KActivityIndicator from 'react-native-kactivityindicator';
import {ProgressPerApi} from "./ProgressPerApi";

export class Http {

    static isRetLogin = false;//是否重新登录
    // static destDownload = `${RNFS.DocumentDirectoryPath}/`;//下载目录 此目录会在app升级后被覆盖
    static destDownload = Platform.OS == "ios"
        ? `${RNFS.DocumentDirectoryPath}/download`
        : `${RNFS.ExternalStorageDirectoryPath}/download`;//下载目录
    // static isIndicate = true;

    static getConnectionInfo(){
        return new Promise((resolve,reject) => {
            NetInfo.getConnectionInfo()
                .then((connectionInfo) => {
                    if((connectionInfo.type != "none" && Tools.platformType)
                        || (!Tools.platformType && connectionInfo.type != "NONE")
                        || (__DEV__ && connectionInfo.type != "none"
                            && connectionInfo.type != "NONE"))
                    {
                        resolve(connectionInfo);
                    }
                    else
                    {
                        TalkingData.trackEvent("网络未链接",TalkingData.EventTabel.userEvent,connectionInfo);
                        Tools.toast("未连接网络");
                        reject({status:"未连接网络"});
                    }
                });
        });
    }

    /**
     * 基于 ajax 封装的 网络请求
     * @param type strng; //请求类型GET或POST
     * @param url string; //请求地址
     */
    static requestAjax(type,url){
        let timeout = true;

        //Tools.toast(isProgress ? "T" : "F")
        let fetchTimeout = new Promise((resolve,reject)=>{
            setTimeout(()=>{
                    if(timeout){
                        console.log("-----------------------------------------httpAjax " + url + " Timeout start-------------------------------------");
                        console.log("-----------------------------------------httpAjax " + url + " Timeout end-------------------------------------");

                        // TalkingData.trackEventHttp("Timeout",url,type);
                        this.putErrInfo("Timeout",url,type,{
                            statusCode:-1,
                        },{});

                        reject({status:"Timeout"});
                    }
                },
                HttpUrls.urlSets.urlLogin == url
                || HttpUrls.urlSets.urlLoginInfo == url
                    ? 5000
                    : 30000);
        });

        // alert(JSON.stringify(fetchOptions))
        let fetchPromise =  new Promise((resolve, reject)=>{

            this.getConnectionInfo()
                .then((connectionInfo) => {
                    var request = new XMLHttpRequest();

                    request.onreadystatechange = (e) => {
                        if (request.readyState !== 4) {
                            return;
                        }
                        timeout = false;
                        if (request.status === 200) {
                            console.log("-----------------------------------------httpAjax " + url + " success start-------------------------------------");
                            console.info('success', request.responseText);
                            console.log("-----------------------------------------httpAjax " + url + " success end-------------------------------------");
                            resolve(request.responseText);
                            //alert(request.responseText)
                        } else {
                            console.log("-----------------------------------------httpAjax " + url + " err start-------------------------------------");
                            console.log('err');
                            console.log("-----------------------------------------httpAjax " + url + " err end-------------------------------------");

                            // TalkingData.trackEventHttp("exception",url,type,url);
                            this.putErrInfo("exception",url,type,{
                                statusCode:request.status,
                            },{});
                            reject({status:-1});

                        }
                    };

                    request.open(type, url);
                    request.send();

                    // alert(JSON.stringify(connectionInfo));
                    // console.log('Initial, type: ' + connectionInfo.type + ', effectiveType: ' + connectionInfo.effectiveType);
                })
                .catch(retJson=>{
                    reject(retJson);
                });

        });

        /**
         * 其中一个谁先执行，其他的会被舍弃
         * **/
        return Promise.race([fetchPromise,fetchTimeout]);
    }

    /**
     * 基于 ajax 封装的 网络请求
     * @param url string; //请求地址
     */
    static getAjax(url){
        return this.requestAjax("GET",url);
    }

    /**
     * 基于 ajax 封装的 网络请求
     * @param url string; //请求地址
     */
    static postAjax(url){
        return this.requestAjax("POST",url);
    }

    /**
     * 通过经纬度获取详细地址（百度接口）
     * @param lat int,//纬度
     * @param lng int,//经度
     * **/
    static getAddress(lat,lng){
        let locationJson = {
            city:null,//城市名
            cityCode:null,//城市代码
            address:null,//地址
            lat:lat,//维度
            lng:lng,//经度
            timestamp:new Date().getTime(),
        };
        return new Promise(resolve => {
            this.getConnectionInfo()
                .then((connectionInfo) => {
                    // location: {log:113.264531,lat:23.157003},
                    /*let url = "http://api.map.baidu.com/geocoder/v2/?" +
                        "ak=C93b5178d7a8ebdb830b9b557abce78b&callback=renderReverse&location="
                        + lat + "," + lng +"&pois=0";*/

                    /* let url = "https://restapi.amap.com/v3/assistant/coordinate/convert?" +
                         "locations=113.32007372983196,23.120272663850958&coordsys=gps" +
                         "&output=json&key=9f6788450fe0354d26fdb9a46ffd728b";*/
                    let url = "https://restapi.amap.com/v3/assistant/coordinate/convert?" +
                        "locations=" + lng + "," + lat + "&coordsys=gps" +
                        "&output=json&key=9f6788450fe0354d26fdb9a46ffd728b";



                    this.getAjax(url).then(retJson2=>{

                        retJson2 = JSON.parse(retJson2);
                        // retJson2.locations = "113.31420850684037,23.09863836095986";

                        url = "https://restapi.amap.com/v3/geocode/regeo?output=json&" +
                            "location=" + retJson2.locations + "&key=9f6788450fe0354d26fdb9a46ffd728b" +
                            "&radius=100&extensions=all";

                        let locations = retJson2.locations.split(",");


                        this.getAjax(url)
                            .then(retJson=>{
                                let response = JSON.parse(retJson);

                                /*let response = JSON.parse(retJson.substring(retJson.indexOf('{'), (retJson.lastIndexOf("}") + 1)));
                                let locationJson = {
                                    city:response.result.addressComponent.city,//城市名
                                    cityCode:response.result.addressComponent.adcode,//城市代码
                                    address:response.result.formatted_address,//地址
                                    lat:response.result.location.lat,//维度
                                    lng:response.result.location.lng,//经度
                                    timestamp:new Date().getTime(),
                                };*/

                                /*let locationJson = {
                                    city:response.regeocode.addressComponent.city,//城市名
                                    cityCode:response.regeocode.addressComponent.adcode,//城市代码
                                    address:response.regeocode.formatted_address,//地址
                                    lat:locations[1],//维度
                                    lng:locations[0],//经度
                                    timestamp:new Date().getTime(),
                                };*/
                                locationJson.city = response.regeocode.addressComponent.city;//城市名
                                locationJson.cityCode = response.regeocode.addressComponent.adcode;//城市代码
                                locationJson.address = response.regeocode.formatted_address;//地址
                                locationJson.lat = locations[1];//维度
                                locationJson.lng = locations[0];//经度
                                locationJson.timestamp = new Date().getTime();

                                console.info("locationJson",locationJson);

                                resolve(locationJson);
                            })
                            .catch(()=>{
                                resolve(locationJson);
                            });



                    });
                })
                .catch(()=>{
                    resolve(locationJson);
                });
        });
    }

    static putErrInfo(name,urlV,type,response={},params = {}){
        let infoObj = {};
        if(response){

            if(typeof response == "object"){
                infoObj = Object.assign(params, response);
            }
            else
            {
                params.errInfo = response;
                infoObj = params;
            }
        }

        infoObj.time = Tools.timeFormatConvert((new Date()).getTime(),"YYYY-MM-DD HH:mm:ss");


        TalkingData.trackEventHttp(name,urlV,type,infoObj);
    }

    /**
     * 基于 fetch 封装的 网络请求
     * @param type strng; //请求类型GET或POST
     * @param url string; //请求地址
     * @param params json; //地址请求参数 json params中可以用isNotUser来控制是否附加用户ID isNotUser:true =》不附加用户ID，默认附加用户id
     * @param headers json; //地址请求头 json
     * @param isDefaultHeaders bool; //是否使用默认请求头，false：不使用，true：使用，不传默认使用
     * @param isProgress bool; //是否使用加载条，false：不使用，true：使用，不传默认使用
     * @returns {Promise}
     */
    static request(type,url, params = {},isProgress, headers,isDefaultHeaders){

        params = JSON.parse(JSON.stringify(params));

        if(this.isRetLogin){
            return new Promise((resolve,reject)=>{
                reject({status:"retLogin"});
            });
        }

        if(isProgress == undefined)
        {
            isProgress = true;
        }

        isProgress = isProgress == undefined ? true : isProgress;


        isDefaultHeaders = isDefaultHeaders == undefined ? true : isDefaultHeaders;
        headers = isDefaultHeaders && headers == undefined ? {} : headers;
        if(isDefaultHeaders)
        {
            headers["Content-Type"] = "application/json";
            headers["Accept"] = "application/json";
            headers["deviceType"] = "2";
            if(Tools.userConfig.token != null)
            {
                headers["token"] = Tools.userConfig.token;
                headers["Authorization"] = Tools.userConfig.token;
                // headers["token"] = "b78a8d0ec04d38c8d06ad3d0dda05788";
            }
        }

        let fetchOptions =  headers == undefined ?
            {method: type,}
            :{
                method: type,
                headers: headers,
            };

        params = params == undefined ? {} : params;
        if(!params.isNotUser)
        {
            params.userId = Tools.userConfig.userInfo == null
                ? ''
                : Tools.userConfig.userInfo.id;
            params.user_id = params.userId;
            params.phone = Tools.userConfig.userInfo == null
                ? ''
                : Tools.userConfig.userInfo.phone;

        }

        //删除params数据中的isNotUser属性
        delete params["isNotUser"];


        let timer = null;
        let timeout = true;
        let fetchTimeout = new Promise((resolve,reject)=>{
            timer = setTimeout(()=>{
                if(timeout){
                    isProgress ? KActivityIndicator.hide() : null;
                    // isProgress ? Tools.progress.show(false) : null;
                    // Tools.progress.show(false)
                    console.log("-----------------------------------------httpRequest " + url + " Timeout start-------------------------------------");
                    console.info("requestData:",params);
                    // TalkingData.trackEventHttp("Timeout",url,type,params);
                    this.putErrInfo("Timeout",urlV,type,{
                        statusCode:-1,
                    },params);
                    reject({status:"Timeout"});
                    console.log("-----------------------------------------httpRequest " + url + " Timeout end-------------------------------------");
                }

            },30000);
        });

        let urlV = url;

        if (type.toUpperCase() == "GET" && params != null && params != undefined) {
            let paramsArray = [];
            //encodeURIComponent
            Object.keys(params).forEach(key => paramsArray.push(key + '=' + params[key]));

            if (url.search(/\?/) === -1)
            {
                url += '?' + paramsArray.join('&');
            }
            else
            {
                url += '&' + paramsArray.join('&');
            }
        }
        else if(type.toUpperCase() == "POST" )
        {
            fetchOptions["body"] = JSON.stringify(params);
        }

        // alert(JSON.stringify(fetchOptions))
        let fetchPromise =  new Promise((resolve, reject)=>{

            if(!Tools.cutLogin && url == HttpUrls.urlSets.urlLogin){
                Tools.toast("urlLogin接口不允许调用");
                reject({status:-1});
            }
            else if(!Tools.cutLogin && url == HttpUrls.urlSets.urlLoginInfo){
                Tools.toast("urlLoginInfo接口不允许调用");
                reject({status:-1});
            }
            else {
                this.getConnectionInfo()
                    .then((connectionInfo) => {

                        // isProgress ? Tools.progress.show() : null;
                        isProgress ? KActivityIndicator.show(true, "加载中...") : null;

                        //alert(JSON.stringify(fetchOptions))
                        fetch(url, fetchOptions)
                            .then((response) => {

                                clearTimeout(timer);
                                timeout = false;

                                // isProgress ? Tools.progress.show(false) : null;
                                isProgress ? KActivityIndicator.hide() : null;
                                /* if(url == HttpUrls.urlSets.urlGetDepartmentListByParentId)
                                 {
                                     alert(HttpUrls.urlSets.urlGetDepartmentListByParentId);
                                 }*/

                                // console.info("response YYYY:",response);
                                if (response.ok) {

                                    return response.json();

                                }
                                else {
                                    console.log("-----------------------------------------httpRequest " + url + " error-------------------------------------");
                                    console.info("requestData:",params);
                                    console.info("errInfo:",response);
                                    console.log("-----------------------------------------httpRequest " + url + " error end-------------------------------------");

                                    this.putErrInfo("excep-service",urlV,type,{
                                        statusCode:response.status,
                                    },params);
                                    Tools.toast("后台报错,请联系管理员");
                                    return {retCode:-40440};
                                }
                            })
                            .then((response) => {
                                if(response.retCode == -40440){
                                    reject({status: -1});

                                    return response;
                                }

                                if(url == HttpUrls.urlSets.urlLoginInfo){
                                    Tools.cutLogin = false;
                                }

                                console.log("-----------------------------------------httpRequest " + url + " success start-------------------------------------");
                                console.info("requestData:",params);
                                console.info("response:",response);
                                console.log("-----------------------------------------httpRequest " + url + " success end-------------------------------------");

                                try {
                                    if(response.retCode == undefined){
                                        response.retCode = response.code == '0'
                                            ? '0000'
                                            : response.code;
                                    }

                                    if(url == HttpUrls.urlSets.urlAppleAPPInfo)
                                    {
                                        resolve(response);

                                    }
                                    else if(response.retCode == '0000' )
                                    {
                                        resolve(response);

                                    }
                                    else if(response.retCode == '9999' && !this.isRetLogin)
                                    {
                                        this.isRetLogin = true;
                                        Tools.cutLogin = true;

                                        //"提示","登录失效，请重新登录",['取消', '登录']
                                        Alert.alert(
                                            "提示",
                                            "登录失效，请重新登录",
                                            [
                                                // {text: 'Ask me later', onPress: () => console.log('Ask me later pressed')},
                                                {text: '取消', onPress: () => {
                                                        this.isRetLogin = false;
                                                    }, style: 'cancel'},
                                                {text: '确定', onPress: () => {
                                                        this.isRetLogin = false;
                                                        Tools.baseComponent.goPage("PageLogin");
                                                    }},
                                            ],
                                            { cancelable: false }
                                        );

                                        reject({
                                            status:response.retCode,
                                            info:response,
                                        });

                                    }
                                    else if(response.retCode == '0008')
                                    {
                                        Tools.cutLogin = true;
                                        //门投人员提示 "提示","您是门投人员，请切换门投版！",['取消', '切换']
                                        Alert.alert(
                                            "提示",
                                            "您是门投人员，请切换门投版！",
                                            [
                                                // {text: 'Ask me later', onPress: () => console.log('Ask me later pressed')},
                                                {text: '取消', onPress: () => {}, style: 'cancel'},
                                                {text: '切换', onPress: () => {
                                                        Tools.page.onMenuItemSelected("门投版");
                                                    }},
                                            ],
                                            { cancelable: false }
                                        );

                                        reject({
                                            status:response.retCode,
                                            info:response,
                                        });
                                    }
                                    else
                                    {
                                        if(url == HttpUrls.urlSets.urlLoginInfo){
                                            Tools.cutLogin = true;
                                        }
                                        Tools.toast(response.retMsg);
                                        reject({
                                            status:response.retCode,
                                            info:response,
                                        });
                                    }
                                }
                                catch (e){

                                    this.putErrInfo("excep-Filed",urlV,type,response,params);

                                    console.log("-----------------------------------------httpRequest " + url + " error-------------------------------------");
                                    console.info("requestData:",params);
                                    console.info("exception:",e);
                                    console.log("-----------------------------------------httpRequest " + url + " error end-------------------------------------");
                                    Tools.toast("后台报错，返回为空(undefined)");
                                    reject({
                                        status:-1,
                                        info:'response为undefined',
                                    });
                                }



                            })
                            .catch(err => {

                                clearTimeout(timer);

                                this.putErrInfo("exception",urlV,type,err,params);

                                // isProgress ? Tools.progress.show(false) : null;
                                isProgress ? KActivityIndicator.hide() : null;

                                // TalkingData.trackEventHttp("exception",urlV,type,params);

                                console.log("-----------------------------------------httpRequest " + url + " error-------------------------------------");
                                console.info("requestData:",params);
                                console.info("err:",err);
                                console.log("-----------------------------------------httpRequest " + url + " error end-------------------------------------");
                                Tools.toast("请求失败，找不到服务器，请联系管理员");
                                reject({status: -1});
                            });

                        // alert(JSON.stringify(connectionInfo));
                        // console.log('Initial, type: ' + connectionInfo.type + ', effectiveType: ' + connectionInfo.effectiveType);
                    })
                    .catch(retJson=>{

                        clearTimeout(timer);

                        // isProgress ? Tools.progress.show(false) : null;
                        isProgress ? KActivityIndicator.hide() : null;
                        reject(retJson);
                    });
            }

        });

        /**
         * 其中一个谁先执行，其他的会被舍弃
         * **/
        return Promise.race([fetchPromise,fetchTimeout]);

    }

    /**
     * 基于 fetch 封装的 Get请求  FormData 表单数据
     * @param url string; //请求地址
     * @param params json; //地址请求参数 json
     * @param headers json; //地址请求头 json
     * @param isDefaultHeaders bool; //是否使用默认请求头，false：不使用，true：使用，不传默认使用
     * @returns {Promise}
     */
    static get(url, params, isProgress, headers,isDefaultHeaders) {

        return this.request("GET",url, params, isProgress, headers,isDefaultHeaders);
    }

    /**
     * 基于 fetch 封装的 POST请求  FormData 表单数据
     * @param url string; //请求地址
     * @param params json; //地址请求参数 json
     * @param headers json; //地址请求头 json
     * @param isDefaultHeaders bool; //是否使用默认请求头，false：不使用，true：使用，不传默认使用
     * @returns {Promise}
     */
    static post(url, params,isProgress, headers,isDefaultHeaders) {

        return this.request("POST",url, params, isProgress, headers,isDefaultHeaders);
    }

    /**
     * 上传文件
     * @param filePath string,//文件路径
     * @param mimeType string,//文件类型
     * **/
    static upLoadFile(filePath,mimeType){

        if(filePath == undefined)
        {
            return;
        }

        return new Promise((resolve, reject)=>{
            /*reject = reslv;
             resolve = rej;*/
            this.getConnectionInfo()
                .then((connectionInfo) => {
                    // Tools.progressPer.show();
                    ProgressPerApi.show(0);
                    Http.post(HttpUrls.urlSets.urlFileToken,{},false)
                        .then((retJson) =>{
                            // Tools.toast(JSON.stringify(retJson));

                            if(Tools.platformType)
                            {
                                // create an array of objects of the files you want to upload
                                var files = [
                                    {
                                        name: 'Filedata',
                                        filename: filePath.substring(filePath.lastIndexOf("/") + 1),
                                        filepath: filePath,
                                        // filetype: 'multipart/form-data'
                                    },
                                ];

                                // upload files
                                RNFS.uploadFiles({
                                    toUrl: HttpUrls.urlSets.urlFile,
                                    files: files,
                                    method: 'POST',
                                    headers: {
                                        // 'ContentType':'multipart/form-data',
                                        // Accept: 'application/json',
                                        token:retJson.retData.token,
                                        // token:"cec2567515c751f96118833e4d050709",
                                    },
                                    fields: {
                                        token:retJson.retData.token,
                                        // token:"cec2567515c751f96118833e4d050709",
                                    },
                                    begin: (response) => {
                                        // var jobId = response.jobId;
                                        // console.log('UPLOAD HAS BEGUN! JobId: ' + jobId);
                                        // Tools.toast(jobId);
                                    },
                                    progress: (response) => {
                                        var percentage = Math.floor(
                                            (response.totalBytesSent/response.totalBytesExpectedToSend)
                                        );
                                        // Tools.toast(percentage);
                                        // console.log('UPLOAD IS ' + percentage + '% DONE!');
                                        // Tools.progressPer.setPogress(percentage);
                                        ProgressPerApi.show(percentage);
                                    }
                                })
                                    .promise.then((response) => {

                                    // Tools.progressPer.show(false);
                                    // Tools.progressPer.hide();
                                    ProgressPerApi.hide();

                                    console.log("-----------------------------------------httpRequest " + HttpUrls.urlSets.urlFile + " success start-------------------------------------");
                                    console.info("requestData:",files);
                                    console.info("response:",response);
                                    console.log("-----------------------------------------httpRequest " + HttpUrls.urlSets.urlFile + " success end-------------------------------------");

                                    if (response.statusCode == 200)
                                    {
                                        response = JSON.parse(response.body);

                                        if(response.errcode == 0){
                                            // if(true){

                                            resolve(response.data);
                                            // Tools.toast('FILES UPLOADED!');
                                            // console.log('FILES UPLOADED!'); // response.statusCode, response.headers, response.body
                                        }
                                        else
                                        {
                                           /* TalkingData.trackEventHttp("exce-Filed",
                                                HttpUrls.urlSets.urlFile,
                                                "POST",
                                                {
                                                    errName:"fileErr",
                                                    errcode:response ? response.errcode + "" : "null"
                                                });
                                            Tools.toast("上传失败，请联系管理员");*/


                                            let obj = typeof response == "object" ? response : {
                                                errName:"fileErr_Filed",
                                                errcode:response + ""
                                            };

                                            this.putErrInfo("excep-Filed",HttpUrls.urlSets.urlFile
                                                ,"POST",obj,files);
                                            /*TalkingData.trackEventHttp("excep-Filed",
                                                HttpUrls.urlSets.urlFile,
                                                "POST",
                                                obj);*/

                                            reject({status:-1});
                                        }

                                    }
                                    else {
                                        Tools.toast("上传失败，请重试....");

                                       /* TalkingData.trackEventHttp("exception",
                                            HttpUrls.urlSets.urlFile,
                                            "POST",
                                            {
                                                errName:"fileErr",
                                                statusCode:response.statusCode
                                            });*/

                                        this.putErrInfo("exception",HttpUrls.urlSets.urlFile
                                            ,"POST", {
                                                errName:"fileErr",
                                                statusCode:response.statusCode
                                            },files);
                                        reject({status:-1});
                                        // Tools.toast('SERVER ERROR');
                                        // alert("err: " + JSON.stringify(response))
                                    }
                                })
                                    .catch((err) => {
                                        // Tools.progressPer.show(false);
                                        Tools.toast("请检查网络....");
                                        ProgressPerApi.hide();

                                        // TalkingData.trackEventHttp("exception",HttpUrls.urlSets.urlFile,null,"文本失败");

                                        if(err.description === "cancelled") {
                                            // cancelled by user
                                        }
                                        // console.log(err);
                                        // alert("err: " + JSON.stringify(err));

                                        reject({status:-1});
                                    });
                            }
                            else
                            {

                                let formData = new FormData();//如果需要上传多张图片,需要遍历数组,把图片的路径数组放入formData中
                                let file = {uri: filePath, type: 'multipart/form-data', name: filePath.substring(filePath.lastIndexOf("/") + 1)};   //这里的key(uri和type和name)不能改变,
                                formData.append("Filedata",file);   //这里的files就是后台需要的key


                                /*let formData = new FormData();
                                 for(var i = 0;i<imgAry.length;i++){
                                 let file = {uri: imgAry[i], type: 'multipart/form-data', name: 'image.png'};
                                 formData.append("files",file);
                                 }*/

                                fetch(HttpUrls.urlSets.urlFile,{
                                    method:'POST',
                                    headers:{
                                        'ContentType':'multipart/form-data',
                                        'token':retJson.retData.token,
                                    },
                                    body:formData,
                                })
                                    .then((response) => {
                                        // Tools.progressPer.show(false);
                                        ProgressPerApi.hide();
                                        if (response.ok) {

                                            return response.json();

                                        }
                                        else {
                                            //alert("ddll :" + JSON.stringify({status: response.status}))
                                            //reject({status: response.status});
                                            this.putErrInfo("excep-service",
                                                HttpUrls.urlSets.urlFile,
                                                "POST",{
                                                statusCode:response.status,
                                            },file);
                                            Tools.toast("后台报错,请联系管理员");
                                            return {retCode:-40440};
                                        }
                                        // return response.json();
                                    } )
                                    .then((responseData)=>{

                                        if(response.retCode == -40440){
                                            reject({status: -1});
                                        }

                                        console.log("-----------------------------------------httpRequest " + HttpUrls.urlSets.urlFile + " success start-------------------------------------");
                                        console.info("requestData:",files);
                                        console.info("response:",responseData);
                                        console.log("-----------------------------------------httpRequest " + HttpUrls.urlSets.urlFile + " success end-------------------------------------");

                                        if(responseData.errcode == 0){

                                            // alert("responseData:  " + JSON.stringify(responseData.data));
                                            resolve(responseData.data);
                                        }
                                        else
                                        {
                                            Tools.toast("上传失败，请联系管理员");
                                           /* TalkingData.trackEventHttp("exce-Filed",
                                                HttpUrls.urlSets.urlFile,
                                                "POST",
                                                {
                                                    errName:"fileErr",
                                                    statusCode:responseData ? responseData.errcode + "" : "null"
                                                });*/

                                           let obj = typeof responseData == "object" ? responseData : {
                                               errName:"fileErr_Filed",
                                               errcode:responseData + ""
                                           };
                                           /* TalkingData.trackEventHttp("exce-Filed",
                                                HttpUrls.urlSets.urlFile,
                                                "POST",
                                                obj);*/
                                            this.putErrInfo("excep-Filed",HttpUrls.urlSets.urlFile
                                                ,"POST", obj,file);
                                            reject({status:-1});
                                        }

                                        // console.log('responseData',responseData);
                                    })
                                    .catch((error)=>{
                                        // Tools.progressPer.show(false);
                                        ProgressPerApi.hide();
                                        // console.error('error',error)
                                        Tools.toast("上传失败，请重试....");
                                        /*TalkingData.trackEventHttp("exception",
                                            HttpUrls.urlSets.urlFile,
                                            "POST",
                                            {
                                                errName:"fileErr",
                                                statusCode:error
                                            });*/
                                        this.putErrInfo("exception",HttpUrls.urlSets.urlFile
                                            ,"POST", error,file);
                                        reject({status:-1});
                                        // alert("error: " + JSON.stringify(error));
                                    });
                            }

                            /*var options = {};
                             options.fileKey = 'Filedata';
                             options.fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
                             options.mimeType = mimeType;
                             // options.mimeType = 'text/plain';
                             // options.mimeType = 'image/png';
                             // options.httpMethod = 'PUT';

                             var params = {};
                             params.token = retJson.retData.token;
                             params.value2 = 'param';
                             options.params = params;

                             var headers={token:retJson.retData.token};
                             // var headers={token:"b24584ee276836bf2b6f5fab01f867c6"};
                             options.headers = headers;

                             // alert(JSON.stringify(options));
                             var fileTransfer = new FileTransfer();
                             fileTransfer.onprogress = (progress) => {
                             // if (progress.lengthComputable) {
                             if (true) {

                             let per = (progress.loaded / progress.total).toFixed(3);
                             /!*per = per * 1000;
                             per = parseInt(per) / 1000;*!/
                             Tools.toast(per)
                             // Tools.progressPer.setPogress(per);
                             }
                             else {
                             // Tools.progress.show();
                             }
                             // alert("progress: " + JSON.stringify(progress));
                             };

                             // filePath = 'file://' + filePath;  //encodeURI(HttpUrls.urlSets.urlFile)
                             fileTransfer.upload(filePath, encodeURI(HttpUrls.urlSets.urlFile),(result)=>{
                             // Tools.progressPer.show(false);
                             // console.log(result);
                             alert("result: " + JSON.stringify(result));
                             }, (error)=>{
                             // console.log(error);
                             // Tools.progressPer.show(false);
                             // Tools.progress.show(false);
                             alert("error: " + JSON.stringify(error));
                             }, options);*/


                        })
                        .catch((retJson) =>{
                            // Tools.progressPer.show(false);
                            ProgressPerApi.hide();
                            reject({status:-1});
                        });
                })
                .catch(retJson=>{
                    reject(retJson);
                });


        });

    }

    /**
     * 上传文件
     * @param filePathList array,//文件路径,成员是数据
     filePathList成员：{
        localPath: "文件路径",
     } 或 只有"文件路径"的一纬数组
     注：  可以含有任何字段并且一起返回，但不可将在字段放入返回成员的localPath和servicePath两个字段，
     否则servicePath会被替换，localPath放入本地路径则上传文件，若是网路路径，则跳过上传，路径存入
     servicePath字段
     * @param index int，//上传数组路径地址
     * @param count int，//上传数量
     *
     * return array;//成员含：{  localPath:'本地文件路径',
                        servicePath:'服务器回传路径',}
     * **/
    static upLoadFileToService(filePathList = [],index = 0,count = 1){

        return new Promise((resolve, reject) => {

            filePathList = filePathList == undefined ? [] :filePathList;
            count = count == undefined ? 1 :count;
            if(index == 0){
                let fileList = [];

                filePathList.forEach((v,i,a)=>{
                    if(typeof(v) == 'string'){
                        fileList.push({
                            localPath:v
                        });
                    }
                    else {
                        fileList.push(v);
                    }
                });

                filePathList = fileList;
            }

            if(filePathList.length > 0){

                index = index == undefined ? 0 : index;

                // console.info("filePathList",filePathList)

                this.upLoadFileToServicePutIn(filePathList,index,count,resolve);

                /*if(filePathList[index].localPath.indexOf("http") == 0){
                    filePathList[index].servicePath = filePathList[index].localPath;
                    if(filePathList.length == (index + 1)){
                        Tools.toast("上传完成");
                        // console.log(filePathList)
                        resolve(filePathList);
                    }
                    else
                    {
                        this.upLoadFileToService(filePathList,++index,count);
                    }
                }
                else {
                    // console.log(filePathList)
                    Tools.toast("第" + count + "张正在上传 ");

                    this.upLoadFile(filePathList[index].localPath)
                        .then(retJson=>{
                            // alert(JSON.stringify(retJson))
                            filePathList[index].servicePath = retJson.url;

                            if(filePathList.length == (index + 1)){
                                Tools.toast("上传完成");
                                resolve(filePathList);
                            }
                            else
                            {
                                this.upLoadFileToService(filePathList,++index,++count);
                            }
                        });
                }*/

            }
            else
            {
                // Tools.toast("没有上传文件路径");
                // reject({status:-1});
                resolve(filePathList);
            }


        });
    }

    static upLoadFileToServicePutIn(filePathList = [],index = 0,count = 1,resolve){
        if(filePathList[index].localPath.indexOf("http") == 0){
            filePathList[index].servicePath = filePathList[index].localPath;
            if(filePathList.length == (index + 1)){
                Tools.toast("上传完成");
                // console.log(filePathList)
                resolve(filePathList);
            }
            else
            {
                this.upLoadFileToServicePutIn(filePathList,++index,count,resolve);
            }
        }
        else {
            Tools.toast("第" + count + "张正在上传 ");

            this.upLoadFile(filePathList[index].localPath)
                .then(retJson=>{
                    // alert(JSON.stringify(retJson))
                    filePathList[index].servicePath = retJson.url;

                    if(filePathList.length == (index + 1)){
                        Tools.toast("上传完成");
                        resolve(filePathList);
                    }
                    else
                    {
                        this.upLoadFileToServicePutIn(filePathList,++index,++count,resolve);
                    }
                });
        }
    }

    /**
     * 下载文件
     * @param fileAddress,//文件地址
     * **/
    static downloadFile(fileAddress) {

        return  new Promise((resolve,reject)=>{

            if(fileAddress.indexOf("http") == 0){

                let downloadDest = this.destDownload + `${fileAddress.substring(fileAddress.lastIndexOf('/') + 1)}`;
                RNFS.exists(downloadDest)
                    .then((exist) =>{
                        if(!exist){
                            this.getConnectionInfo()
                                .then((connectionInfo) => {

                                    if(fileAddress == undefined)
                                    {
                                        Tools.toast("请传入文件地址")
                                        reject({status:-1});
                                    }
                                    /*else if(Tools.progressPer == null)
                                    {
                                        Tools.toast(`请在页面放入进程条\<ProgressPer \/ \>`);
                                        return;
                                    }*/

                                    // 音频
                                    //const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.mp3`;
                                    // let downloadDest = `${RNFS.MainBundlePath}/${fileAddress.substring(fileAddress.lastIndexOf('/') + 1)}`;
                                    // let downloadDest = `${RNFS.DocumentDirectoryPath}/${fileAddress.substring(fileAddress.lastIndexOf('/') + 1)}`;
                                    // http://wvoice.spriteapp.cn/voice/2015/0902/55e6fc6e4f7b9.mp3
                                    //const formUrl = 'http://wvoice.spriteapp.cn/voice/2015/0818/55d2248309b09.mp3';VideoView_android.js

                                    /*alert(JSON.stringify(downloadDest));
                                     return;*/

                                    let options = {
                                        fromUrl: fileAddress,
                                        toFile: downloadDest,
                                        background: true,
                                        headers: {
                                            // 'Cookie': cookie //需要添加验证到接口要设置cookie
                                        },
                                        begin: (res) => {
                                            /*console.log('begin', res);
                                             console.log('contentLength:', res.contentLength / 1024 / 1024, 'M');*/
                                            // alert(JSON.stringify(res));
                                        },
                                        progress: (res) => {

                                            //let per = (res.bytesWritten / res.contentLength).toFixed(3);
                                            let per = (res.bytesWritten / res.contentLength);
                                            // per = per * 1000;
                                            // per = parseInt(per);
                                            // per = per / 1000;

                                            // Tools.progressPer.setPogress(per);
                                            ProgressPerApi.show(per);
                                        }
                                    };

                                    try {
                                        let ret = RNFS.downloadFile(options);
                                        ret.promise.then(retJson => {
                                            /* console.log('success', res);
                                             console.log('file://' + downloadDest)*/

                                            retJson["filePath"] = downloadDest;
                                            // Tools.progressPer.show(false);
                                            ProgressPerApi.hide();
                                            resolve(retJson);

                                        }).catch(err => {
                                            //console.log('err', err);
                                            // Tools.progressPer.show(false);
                                            ProgressPerApi.hide();
                                            reject(err);
                                        });
                                    }
                                    catch (e) {
                                        //console.log(error);
                                        // Tools.progressPer.show(false);
                                        ProgressPerApi.hide()
                                        reject(e);
                                    }

                                })
                                .catch(retJson=>{
                                    reject(retJson);
                                });
                        }
                        else
                        {
                            // Tools.toast("文件已存在");
                            resolve({
                                filePath:downloadDest
                            });
                        }
                    });



            }
            else
            {
                resolve({
                    filePath:fileAddress
                });
            }


            /* // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)

         // 图片
         // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.jpg`;
         // const formUrl = 'http://img.kaiyanapp.com/c7b46c492261a7c19fa880802afe93b3.png?imageMogr2/quality/60/format/jpg';

         // 文件
         // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.zip`;
         // const formUrl = 'http://files.cnblogs.com/zhuqil/UIWebViewDemo.zip';

         // 视频
         // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.mp4`;
         // http://gslb.miaopai.com/stream/SnY~bbkqbi2uLEBMXHxGqnNKqyiG9ub8.mp4?vend=miaopai&
         // https://gslb.miaopai.com/stream/BNaEYOL-tEwSrAiYBnPDR03dDlFavoWD.mp4?vend=miaopai&
         // const formUrl = 'https://gslb.miaopai.com/stream/9Q5ADAp2v5NHtQIeQT7t461VkNPxvC2T.mp4?vend=miaopai&';*/

            /* // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)

             // 图片
             // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.jpg`;
             // const formUrl = 'http://img.kaiyanapp.com/c7b46c492261a7c19fa880802afe93b3.png?imageMogr2/quality/60/format/jpg';

             // 文件
             // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.zip`;
             // const formUrl = 'http://files.cnblogs.com/zhuqil/UIWebViewDemo.zip';

             // 视频
             // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.mp4`;
             // http://gslb.miaopai.com/stream/SnY~bbkqbi2uLEBMXHxGqnNKqyiG9ub8.mp4?vend=miaopai&
             // https://gslb.miaopai.com/stream/BNaEYOL-tEwSrAiYBnPDR03dDlFavoWD.mp4?vend=miaopai&
             // const formUrl = 'https://gslb.miaopai.com/stream/9Q5ADAp2v5NHtQIeQT7t461VkNPxvC2T.mp4?vend=miaopai&';*/

        });

    }

}

RNFS.mkdir(Http.destDownload);