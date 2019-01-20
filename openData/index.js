/**
 * @author ForeverZi
 * @email txzm2018@gmail.com
 * @create date 2019-01-21 02:36:31
 * @modify date 2019-01-21 02:36:31
 * @desc [description]
 */
const Cache = require("./Cache");

const imgCache = new Cache((img)=>img.src="");

const RES_DIR = 'openData/res/';
const ITEM_WIDTH = 600;
const ITEM_HEIGHT = 150;
const ITEM_SPACINGY = 10;
// 背景图片
const ITEM_BG_PATH = 'itemBg.png';

class Item {
    /**
     * @param {Object} info 显示的信息
     */
    constructor(info) {
        this.canvas = wx.createCanvas();
        this.canvas.width = ITEM_WIDTH;
        this.canvas.height = ITEM_HEIGHT;
        this.context = this.canvas.getContext("2d");
        this.context.baseLine = "middle";
        this.info = info;
        this.rendered = false;
        this.resReadyPromise().then((imgs)=>this.draw(imgs)).catch(err=>console.warn(err));
    }

    //等待所有资源就绪
    resReadyPromise(){
        const imgs = [this.info.avatarUrl, ITEM_BG_PATH];
        return Promise.all(imgs.map(path=>this.imgReadyPromise(path)));
    }

    imgReadyPromise(imgUrl){
        return new Promise((resolve, reject)=>{
            let iurl = imgUrl
            if (!imgUrl.startsWith('http')) {
                iurl = RES_DIR + iurl;
            }
            if (imgCache.get(iurl)) {
                resolve(imgCache.get(iurl));
                return;
            }
            const img = wx.createImage();
            img.src = iurl;
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => {
                reject(`${iurl}加载失败`);
            };
            // 想了一下，还是在这里cache，不希望创建多个img，加载url失败了就let it crash吧
            imgCache.put(iurl, img);
        });
    }

    draw(imgs) {
        this.clear();
        let [avatarImg, bgImg] = imgs; 
        this.context.drawImage(bgImg, 0, 0);
        this.context.drawImage(avatarImg, 30, 17, 88, 88);
        this.drawText(this.info.score, 156, 54);
        this.rendered = true;
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawText(text, x, y, fontSize, color, align) {
        this.context.font = `${fontSize}px Arial`;
        this.context.fillStyle = color || "#ffffff";
        this.context.textAlign = align || "left";
        this.context.fillText(text, x, y, 210);
    }

    setPosition(x, y){
        this.x = x;
        this.y = y;
    }
}

class RankListRenderer {

    constructor(width, height) {
        this.maxDeltaY = 0;
        this.width = width;
        this.height = height;
        this.init();
    }

    init() {
        this.canvas = wx.getSharedCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.startY = this.maxDeltaY;
        this.deltaY = this.startY;
        this.items = [];
        this.show();
        this.startRender();
    }

    listen() {
        wx.onMessage(data => {
            switch (data.command) {
                case 'Init':
                    this.init();
                    break;
                case 'Hide':
                    this.hide();
                    break;
                case 'Destroy':
                    this.destroy();
                    break;
                case 'TouchBegin':
                    break;
                case 'TouchEnd':
                case 'TouchCancel':
                    this.startY = this.deltaY;
                    break;
                case 'TouchMove':
                    this.scroll(data.info);
                    break;
            }
        });
    }

    hide() {
        this.stopRender();
        this.clear();
    }

    destroy() {
        this.hide();
        imgCache.clear();
    }

    show() {
        wx.getFriendCloudStorage({
            keyList: ['score'],
            success: (res) => {
                const data = res.data;
                const details = [];
                for (const info of data) {
                    const detailItem = {};
                    detailItem.avatarUrl = info.avatarUrl;
                    detailItem.nickName = info.nickname;
                    detailItem.score = 0;
                    const list = info.KVDataList;
                    const scoreInfo = list.find((e) => e.key === 'score');
                    if (scoreInfo) {
                        const value = JSON.parse(scoreInfo.value);
                        detailItem.score = value.wxgame.score;
                    }
                    details.push(detailItem);
                }
                details.sort((a, b) => b.score - a.score);
                this.refreshItems(details);
            },
            fail: (err) => {
                console.log('获取排行榜失败：', err);
            }
        });
    }

    startRender(){
        this.stopRender();
        // //开启每帧回调
        const fn = () => {
            if (this.render) {
                this.render();
            }
            this._updateHandler = requestAnimationFrame(fn)
        }
        this._updateHandler = requestAnimationFrame(fn);
    }

    stopRender(){
        if (this._updateHandler) {
            cancelAnimationFrame(this._updateHandler);
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    scroll(info) {
        // cocos和canvas坐标系Y轴方向相反
        // deltaY指在一次触摸事件中，据触摸初始点的Y轴变更值
        const deltaY = -1 * (info.deltaY) + this.startY;
        this.deltaY = Math.min(this.maxDeltaY, Math.max(this.minDeltaY, deltaY));
    }

    render() {
        this.clear();
        this.renderBg();
        let i = 0;
        for (const item of this.items) {
            item.setPosition(10, this.deltaY + i * (ITEM_HEIGHT + ITEM_SPACINGY));
            i++;
        }
        this.items.forEach((item) => this.renderItem(item));
    }

    renderBg() {
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderItem(item){
        if(!this.isItemVisible(item)){
            return;
        }
        this.ctx.drawImage(item.canvas, item.x, item.y);
    }

    isItemVisible(item) {
        if(!item.rendered){
            return false;
        }
        if (item.y >= this.canvas.height || item.y <= -ITEM_HEIGHT) {
            return false;
        } else {                                  
            return true;
        }
    }

    refreshItems(infos) {
        this.items = [];
        for (const info of infos) {
            const item = new Item({
                name: info.nickName,
                score: info.score,
                avatarUrl: info.avatarUrl
            });
            this.items.push(item);
        }
        this.minDeltaY = -(ITEM_HEIGHT + ITEM_SPACINGY) * this.items.length + ITEM_SPACINGY + this.canvas.height + this.maxDeltaY;
    }
}

const renderer = new RankListRenderer();
renderer.listen();