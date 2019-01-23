/**
 * @author ForeverZi
 * @email txzm2018@gmail.com
 * @create date 2019-01-18 21:38:55
 * @modify date 2019-01-18 21:38:55
 * @desc [description]
 */
class Cache{

    constructor(destroyFunc){
        this._pool = {}
        // 销毁值的方法
        this._destroyFunc = destroyFunc;
        this._id = 0;
    }

    get(key){
        return this._pool[key];
    }

    put(key, value){
        // 如果之前的缓存中存在值，则先销毁
        this.delete(key);
        this._pool[key] = value;
    }

    add(value){
        this.delete(this._id);
        this._pool[this._id] = value;
        this._id++;
        return this._id - 1;
    }

    delete(key){
        if(!this._pool[key]){
            return;
        }
        if (typeof this._destroyFunc === 'function') {
            this._destroyFunc(this._pool[key])
        }
        delete this._pool[key];
    }

    clear(){
        if(typeof this._destroyFunc === 'function'){
            const keys = Object.keys(this._pool);
            keys.forEach((key) => this.delete(key));
        }
        this._pool = {};
    }
}

module.exports = Cache;