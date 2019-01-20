/**
 * @author ForeverZi
 * @email txzm2018@gmail.com
 * @create date 2019-01-21 02:35:36
 * @modify date 2019-01-21 02:35:36
 * @desc [description]
 */
cc.Class({
    extends: cc.Component,

    properties: {
        // 开发数据域绑定的Sprite
        subSceneSprite: cc.Sprite,
        // 触摸区域
        touchArea: cc.Node
    },

    onLoad() {
        const openDataContext = wx.getOpenDataContext();
        const sharedCanvas = openDataContext.canvas;
        sharedCanvas.height = this.subSceneSprite.node.height;
        sharedCanvas.width = this.subSceneSprite.node.width;
        this.touchArea.on(cc.Node.EventType.TOUCH_START, () => {
            wx.postMessage({
                command: 'TouchBegin'
            });
        });
        this.touchArea.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
            wx.postMessage({
                command: 'TouchMove',
                deltaY: event.getLocation().y - event.getStartLocation().y
            });
        });
        this.touchArea.on(cc.Node.EventType.TOUCH_END, () => {
            wx.postMessage({
                command: 'TouchEnd'
            });
        });
        this.touchArea.on(cc.Node.EventType.TOUCH_CANCEL, ()=>{
            wx.postMessage({
                command: 'TouchCancel'
            });
        });
    },

    onEnable() {
        wx.postMessage({
            command: 'Init',
        });
    },

    onDisable() {
        wx.postMessage({
            command: 'Hide',
        });
    },

    onDestroy() {
        wx.postMessage({
            command: 'Destroy',
        });
    },

    update() {
        this.drawOpenData();
    },

    drawOpenData() {
        if (!this.tex) {
            this.tex = new cc.Texture2D();
        }
        var openDataContext = wx.getOpenDataContext();
        var sharedCanvas = openDataContext.canvas;
        this.tex.initWithElement(sharedCanvas);
        this.tex.handleLoadedTexture();
        this.openDataSprite.spriteFrame = new cc.SpriteFrame(this.tex);
    },

});
