const chalk = require('chalk');
const fs = require('fs');
const { request, limparString, getAllWords, sleep } = require('./utils');

(async()=>{
    this.Bearer = ``;
    this.baseUri = "https://hotmart.herokuapp.com";
    this.Club = 'esa1anoeumilitar';

    this.Debug = (string = '', type = false) => {
        if(this.debug) return false;
        if(type == 'err') return console.log("[x] " + chalk.bgRed(string));
        if(type == 'suc') return console.log("[v] " + chalk.bgGreen(string));
        if(type == 'inf') return console.log("[i] " + chalk.bgBlue(string));
        return console.log("[!]" + string);
    }

    this.UserInfo = async() => {
        try{
            if(!this.Bearer) return this.Debug(`BEARER NOT FOUND`, 'err'), false;

            let response = await request({
                url: this.baseUri + "/info",
                method: "GET",
                headers: {
                    'Authorization': this.Bearer
                },
                json: true
            });

            if(!response || response.statusCode !== 200 || response.body.error) return this.Debug(`ERROR FIND USER INFO: [${response.error || "error"}]`, 'err'), false;

            return response.body;
        }catch(e){return this.Debug(`ERROR [userinfo]: ${e.message}`, 'err'), false}
    }

    this.ClubInfo = async() => {
        try{
            if(!this.Bearer) return this.Debug(`BEARER NOT FOUND`, 'err'), false;

            let response = await request({
                url: this.baseUri + "/club",
                method: "GET",
                headers: {
                    'Club': this.Club,
                    'Authorization': this.Bearer
                },
                json: true
            });

            if(!response || response.statusCode !== 200 || response.body.error) return this.Debug(`ERROR FIND CLUB INFOS: [${response.error || "error"}]`, 'err'), false;

            return response.body
        }catch(e){return this.Debug(`ERROR [ClubInfo]: ${e.message}`, 'err'), false}
    }

    this.initDow = async(e) => {
        let {name, hash, dir} = e;

        this.Debug(`AGUARDANDO SEGUNDOS OBRIGATORIOS!`,'inf');

        await sleep(2000);

        let info = await request({
            url: this.baseUri + "/page-hot",
            method: "POST",
            headers: {
                'Club': this.Club,
                'Authorization': 'Bearer ' + this.Bearer
            },
            body: {hash: hash},
            json: true
        });
        // return console.log(info)
        if(!info || info.statusCode !== 200 || info.body.error) return this.Debug(`ERROR PAGE INFO [${info.body.error || "error"}]` ,'err'), false;

        if(info.body.type) return info.body.dir = dir, await this.Download(info.body);

        return this.Debug(`MATERIA NÃO POSSUI ARQUIVO PDF [${e.name}]`, 'inf'), true;
    }

    this.Download = async (body) => {
        try{
            if(!body || !this.Bearer) return this.Debug(`${!body ? "body" : !this.Bearer ? "bearer" : ""} not found [error]`, 'err');
            
            this.Debug(`SE PREPARANDO PARA NOVO DOWNLOAD!`,'inf');

            let {attachments, dir} = body;
            let {fileMembershipId, fileName} = attachments[0];

            let file = await request({
                url: this.baseUri + "/download-pdf",
                method: "POST",
                headers: {
                    'Club': this.Club,
                    'Authorization': this.Bearer
                },
                body: {id: fileMembershipId},
                json: true
            });

            if(!file || file.statusCode !== 200) return this.Debug(`ERROR NOT RECOGNIZED [Download][Request: ${file.statusCode}][~file]`,'err'), false;
            
            this.Debug(`INICIANDO NOVO DOWNLOAD: ${fileName}`, 'inf');

            let pdf = await request({url: file.body, encoding: null});

            dir = __dirname + "/" + dir;

            if (!fs.existsSync(dir)) fs.mkdirSync(dir)
        
            fs.writeFileSync(dir + "/" + fileName, pdf.body);
            
            return this.Debug(`ARQUIVO FOI SALVO COM SUCESSO!`,'suc');
        }catch(e){return this.Debug(`ERROR AO BAIXAR ARQUIVO! [${e.message || ""}]`,'err'), false}
    }

    this.InfoPage = async(obj, type = false) => {
        try{
            if(!this.Bearer || !obj || typeof obj !== 'object') return this.Debug(`${!obj ? "Array" : !this.Bearer ? "Bearer" : ""} Not Found [error]`, 'err');
            
            for(let e of obj)
                await this.initDow(e);
            return this.Debug(`FINALIZADO COM SUCESSO!`, 'suc'), true;
        }catch(e){return this.Debug(`ERROR [InfoPage]: ${e.message}`, 'err'), false}
    }

    this.handlerClub = (obj = {}, type = 'modules') => {
        try{
            if(type === 'modules'){
                let response = new Object();
                for(let e of obj.modules)
                    response[limparString(e.name)] = {name: e.name, code: e.code, id: e.id}
                return response
            }

            if(type === 'pages'){
                let response = new Object();
                for(let a of obj.modules)
                    response[limparString(getAllWords(a.name))] = this.ObjPages(a.pages);
                return response    
            }

            if(type === 'exercicio' || type === 'simulado'){
                let response = [];
                    for(let o in obj)
                        obj[o].map(e=> {return e.dir = o, e.name.match(type === 'exercicio' ? /EXERCÍCIO/gi : /SIMULADO/gi) ? response.push(e) : true})
                return response;
            }

            if(type === 'all'){
                let response = [];
                    for(let o in obj)
                        obj[o].map(e=> {return e.dir = o, response.push(e)})
                return response;
            }

            return true;
        }catch(e){return console.log(e)}
    }

    this.ObjPages = (obj) => {
        let response = new Object();
        return obj.map(res => response[limparString(getAllWords(res.name))] = {name: res.name, hash: res.hash})
    }

    this.Process = async() => {
        try{
            let club = await this.ClubInfo();
            if(!club) return;

            let findId = this.handlerClub(club, 'pages');
            if(!findId) return;

            let info = this.handlerClub(findId, 'all');
            if(!info) return;
            // return info;
            let download = await this.InfoPage(info);
        }catch(e){return }
    }

    // console.log(await this.UserInfo())
    // console.log(await this.ClubInfo())
    // console.log(await this.Process())
    // console.log(await this.InfoPage([{hash: "", dir: "teste"}]))

    await this.Process();
})();