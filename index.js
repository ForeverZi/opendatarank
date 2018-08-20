/**
 * @author ForeverZi
 * @email txzm2018@gmail.com
 * @create date 2018-08-20 08:28:06
 * @modify date 2018-08-20 08:28:06
*/
const RES_DIR = 'opendata/res/';
const ITEM_SPACINGY = 13;
const ITEM_HEIGHT = 128;

let imageCache = {};

class Item {
    constructor(canvas, ctx, info) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.info = info;
    }

    drawText(text, left, top, fontSize, color, hAlign){
        left += this.left;
        top += this.top;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = color || "#ffffff";
        this.ctx.textAlign = hAlign || "left";
        this.ctx.baseLine = "middle";
        this.ctx.fillText(text, left, top);
    }

    drawImage(imageFile, left, top, width, height, isRemote){
        return new Promise((resolve, reject)=>{
            left += this.left;
            top += this.top;
            let src;
            if (!isRemote) {
                src = RES_DIR + imageFile + '.png';
            } else {
                src = imageFile;
            }
            if(!imageCache[src]){
                const img = wx.createImage();
                img.src = src;
                img.onload = () => {
                    resolve({
                        img: img,
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                    });
                }
                img.onerror = () => {
                    reject();
                }
                imageCache[src] = img;
            }else{
                resolve({
                    img: imageCache[src],
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                });
            }
        });
    }

    renderImages(){
        if(!this.isVisible()){
            return [];
        }
        let promises = [];
        promises.push(this.drawImage('friendContent', 0, 0, 640, 128));
        let rankSrc;
        switch (this.info.rank) {
            case 1:
                rankSrc = 'first';
                break;
            case 2:
                rankSrc = 'second';
                break;
            case 3:
                rankSrc = 'third';
                break;
            default:
                rankSrc = 'others';
                break;
        }
        promises.push(this.drawImage(rankSrc, -10, -20));
        promises.push(this.drawImage('friendIconOn', 376, 22));
        promises.push(this.drawImage('starNum', 156, 80));
        promises.push(this.drawImage('clothNum', 383, 80));
        if(this.info.avatarUrl){
            promises.push(this.drawImage(this.info.avatarUrl, 30, 17, 88, 88, true));
        }else{
            promises.push(this.drawImage('friendDefaultUserIcon', 30, 17, 88, 88));
        }
        return promises;
    }

    renderTexts(){
        if (!this.isVisible()) {
            return;
        }
        this.drawText(this.info.name, 156, 54, 24, '#A46E63', 'left');
        this.drawText(this.info.dogName, 425, 54, 24, '#A46E63', 'left');
        this.drawText(this.info.starNum, 262, 95, 18, '#A46E63', 'left');
        this.drawText(this.info.clothNum, 496, 95, 18, '#A46E63', 'left');
        this.drawText(this.info.rank, 10, 10, 24, null, 'center');
    }

    setPosition(left, top){
        top = top + (ITEM_HEIGHT + ITEM_SPACINGY) * (this.info.rank - 1);
        this.left = left;
        this.top = top;
    }

    isVisible(){
        if (this.top >= this.canvas.height || this.top <= -ITEM_HEIGHT) {
            return false;
        }else{
            return true;
        }
    }
}

class RankListRenderer{

    constructor(width, height){
        this.maxY = 20;
        this.deltaY = this.maxY;
        this.width = width;
        this.height = height;
        this.items = [];
        this.init();
    }

    init(){
        this.canvas = wx.getSharedCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    refreshItems(infos){
        this.items = [];
        for (const info of infos) {
            const item = new Item(this.canvas, this.ctx, {
                name: info.nickName,
                rank: info.rank,
                starNum: info.starNum || 0,
                clothNum: info.clothNum || 0,
                avatarUrl: info.avatarUrl
            });
            this.items.push(item);
        }
        this.minY = -(ITEM_HEIGHT + ITEM_SPACINGY) * this.items.length + ITEM_SPACINGY - this.maxY;
    }

    listen(){
        wx.onMessage(data => {
            switch(data.command){
            case 'Show':
                this.show();
                break;
            case 'Hide':
                this.clear();
                break;
            case 'Refresh':
                this.show();
                break;
            case 'Destroy':
                this.destroy();
                break;
            case 'Scroll':
                this.scroll(data.info);
                break
            }
        });
    }

    destroy(){
        const imgs = Object.values(imageCache);
        for(const img of imgs){
            img.destroy();
        }
        imageCache = {};
    }

    show(){
        wx.getFriendCloudStorage({
            keyList: ['medal', 'cloth'],
            success: (res) => {
                const data = res.data;
                const details = [];
                for (const info of data) {
                    const detailItem = {};
                    detailItem.avatarUrl = info.avatarUrl;
                    detailItem.nickName = info.nickname;
                    detailItem.starNum = 0;
                    detailItem.clothNum = 0;
                    const list = info.KVDataList;
                    const medal = list.find((e) => e.key === 'star');
                    if (medal) {
                        const value = JSON.parse(medal.value);
                        detailItem.starNum = value.wxgame.score;
                    }
                    const cloth = list.find((e) => e.key === 'cloth');
                    if (cloth) {
                        const value = JSON.parse(cloth.value);
                        detailItem.clothNum = value.wxgame.score;
                    }
                    details.push(detailItem);
                }
                details.sort((a, b) => b.starNum - a.starNum);
                let i = 0;
                for (let item of details) {
                    i++;
                    item.rank = i;
                }
                this.refreshItems(details);
                this.render();
            },
            fail: (err) => {
                console.log('获取排行榜失败：', err);
            }
        });
    }

    clear(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    scroll(info){
        if(this.deltaY - info.y >= this.maxY){
            return;
        }
        if (this.deltaY - info.y - this.canvas.height <= this.minY){
            return;
        }
        this.deltaY -= info.y;
        this.deltaY = Math.max(this.minY, Math.min(this.maxY, this.deltaY));
        this.render();
    }

    renderBg(){
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(){
        for(const item of this.items){
            item.setPosition((this.canvas.width - 640) / 2, this.deltaY);
        }
        const allDrawPromises = [];
        for (const item of this.items) {
            const promises = item.renderImages();
            for(let promise of promises){
                allDrawPromises.push(promise);
            }
        }
        Promise.all(allDrawPromises).then((drawInfos) => {
            this.clear();
            this.renderBg();
            for (const info of drawInfos) {
                if (info.width) {
                    this.ctx.drawImage(info.img, info.left, info.top, info.width, info.height);
                } else {
                    this.ctx.drawImage(info.img, info.left, info.top);
                }
            }
            for (const item of this.items) {
                item.renderTexts();
            }
        }).catch((err) => console.warn(err));
    }
}

const renderer = new RankListRenderer();
renderer.listen();