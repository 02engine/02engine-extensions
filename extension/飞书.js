class Feishu {
    getInfo() {
        return {
            id: 'feishu',
            name: '飞书',
            color1: '#8eace1',
            color2: '#86a2d4',
            blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
            blocks: [
                {
                    opcode: 'switchRequest',
                    blockType: 'command',
                    text: '[STATE] 请求',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        STATE: {
                            type: 'string',
                            menu: 'SWITCH_LIST'
                        }
                    }
                },
                {
                    opcode: '---📰 消息',
                    blockType: 'label',
                    text: '📰 消息',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png'
                },
                {
                    opcode: 'triggerWebhookMessage',
                    blockType: 'command',
                    text: '触发群机器人webhook [ID] 并发送文本 [TEXT]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: '' },
                        TEXT: { type: 'string', defaultValue: '你好！' }
                    }
                },
                {
                    opcode: 'triggerWebhookAtUser',
                    blockType: 'command',
                    text: '触发webhook [ID] 并@[USER_NAME]([USER_ID]) 发送文本 [TEXT]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: '' },
                        USER_ID: { type: 'string', defaultValue: 'all' },
                        USER_NAME: { type: 'string', defaultValue: '所有人' },
                        TEXT: { type: 'string', defaultValue: '你好！' }
                    }
                },
                {
                    opcode: 'triggerWebhookImage',
                    blockType: 'command',
                    text: '触发webhook [ID] 并发送图像 [IMAGE_KEY]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: '' },
                        IMAGE_KEY: { type: 'string', defaultValue: 'img_v3_025j_16d1594a-f4d1-455f-a339-a1c5cfb24deg' }
                    }
                },
                {
                    opcode: 'triggerWebhookCard',
                    blockType: 'command',
                    text: '触发webhook [ID] 并发送卡片 [CARD_ID]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: '' },
                        CARD_ID: { type: 'string', menu: 'CARD_ID' }
                    }
                },
                {
                    opcode: '---🔖 卡片',
                    blockType: 'label',
                    text: '🔖 卡片',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png'
                },
                {
                    opcode: 'cardCreate',
                    blockType: 'command',
                    text: '创建卡片 [ID]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: 'myCard1' }
                    }
                },
                {
                    opcode: 'cardSet',
                    blockType: 'command',
                    text: '设置卡片 [ID] 的 [TYPE] 为 [DATA]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', menu: 'CARD_ID' },
                        TYPE: { type: 'string', menu: 'CARD_CONFIG_TYPE' },
                        DATA: { type: 'string', defaultValue: '{"wide_screen_mode":true}' }
                    }
                },
                {
                    opcode: 'cardJoin',
                    blockType: 'command',
                    text: '将组件 [TYPE] 参数 [DATA] 添加到卡片 [ID]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        TYPE: { type: 'string', menu: 'CARD_COMPONENT_TYPE' },
                        DATA: { type: 'string', defaultValue: '{"content":"我的卡片"}' },
                        ID: { type: 'string', menu: 'CARD_ID' }
                    }
                },
                {
                    opcode: 'cardRemove',
                    blockType: 'command',
                    text: '移除卡片 [ID] 的 [TYPE] 组件',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', menu: 'CARD_ID' },
                        TYPE: { type: 'string', menu: 'CARD_REMOVE_TYPE' }
                    }
                },
                {
                    opcode: '---✈ 捷径',
                    blockType: 'label',
                    text: '✈ 捷径',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png'
                },
                {
                    opcode: 'triggerWebhookJson',
                    blockType: 'command',
                    text: '触发捷径webhook [ID] 并传参 [DATA]',
                    blockIconURI: 'https://m.ccw.site/gandi/feishu.png',
                    arguments: {
                        ID: { type: 'string', defaultValue: '' },
                        DATA: { type: 'string', defaultValue: '{}' }
                    }
                }
            ],
            menus: {
                CARD_ID: {
                    acceptReporters: false,
                    items: '__cardIdMenu'
                },
                CARD_CONFIG_TYPE: [
                    { text: '头部模板', value: 'template' },
                    { text: '头部标题', value: 'title' },
                    { text: '卡片配置', value: 'config' }
                ],
                CARD_COMPONENT_TYPE: [
                    { text: '容器', value: 'div' },
                    { text: 'MarkDown', value: 'markdown' },
                    { text: '文本', value: 'plain_text' },
                    { text: '图片', value: 'img' },
                    { text: '分割线', value: 'hr' },
                    { text: '按钮', value: 'action' },
                    { text: '富文本', value: 'lark_md' },
                    { text: '备注', value: 'note' }
                ],
                CARD_REMOVE_TYPE: [
                    { text: '最后一个', value: 'last' },
                    { text: '所有', value: 'all' }
                ],
                SWITCH_LIST: ['on', 'off']
            }
        };
    }

    constructor() {
        this.requestSwitch = false;
        this.customCards = {
            myCard: {
                config: {},
                elements: [{ tag: "div", text: { content: "**内容**", tag: "lark_md" } }],
                header: { template: "blue", title: { content: "我的卡片", tag: "plain_text" } }
            }
        };
    }

    switchRequest(args) {
        this.requestSwitch = args.STATE === 'on';
    }

    triggerWebhookMessage(args) {
        const id = String(args.ID);
        const text = String(args.TEXT);
        if (id && text && this.requestSwitch) {
            fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg_type: 'text', content: { text } })
            });
        }
        return '';
    }

    triggerWebhookAtUser(args) {
        const id = String(args.ID);
        const userId = String(args.USER_ID);
        const userName = String(args.USER_NAME);
        const text = String(args.TEXT);
        if (id && userId && text && this.requestSwitch) {
            const atText = userId === 'all' 
                ? `<at user_id="all">所有人</at> ${text}`
                : `<at user_id="${userId}">${userName}</at> ${text}`;
            fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg_type: 'text', content: { text: atText } })
            });
        }
        return '';
    }

    triggerWebhookImage(args) {
        const id = String(args.ID);
        const imageKey = String(args.IMAGE_KEY);
        if (id && imageKey && this.requestSwitch) {
            fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg_type: 'image', content: { image_key: imageKey } })
            });
        }
        return '';
    }

    triggerWebhookCard(args) {
        const id = String(args.ID);
        const cardId = String(args.CARD_ID);
        if (id && cardId && this.customCards[cardId] && this.requestSwitch) {
            fetch(`https://open.feishu.cn/open-apis/bot/v2/hook/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg_type: 'interactive', card: this.customCards[cardId] })
            });
        }
        return '';
    }

    cardCreate(args) {
        const id = String(args.ID);
        if (id) {
            this.customCards[id] = {
                config: {},
                elements: [],
                header: { template: 'blue', title: { content: '未命名卡片', tag: 'plain_text' } }
            };
        }
    }

    cardSet(args) {
        const id = String(args.ID);
        const type = String(args.TYPE);
        const data = String(args.DATA);
        if (id && this.customCards[id]) {
            try {
                switch (type) {
                    case 'template': this.customCards[id].header.template = data; break;
                    case 'title': this.customCards[id].header.title.content = data; break;
                    case 'config': this.customCards[id].config = JSON.parse(data) || {}; break;
                }
            } catch (e) { console.error('Feishu card set error', e); }
        }
    }

    cardJoin(args) {
        const type = String(args.TYPE);
        const data = String(args.DATA);
        const id = String(args.ID);
        if (id && this.customCards[id]) {
            try {
                this.customCards[id].elements.push({ tag: type, ...JSON.parse(data) });
            } catch (e) { console.error('Feishu card join error', e); }
        }
    }

    cardRemove(args) {
        const id = String(args.ID);
        const type = String(args.TYPE);
        if (id && this.customCards[id]) {
            if (type === 'last') this.customCards[id].elements.pop();
            if (type === 'all') this.customCards[id].elements = [];
        }
    }

    triggerWebhookJson(args) {
        const id = String(args.ID);
        let data = String(args.DATA);
        if (id && this.requestSwitch) {
            try { data = JSON.parse(data) || {}; } catch (e) { data = {}; }
            fetch(`https://www.feishu.cn/flow/api/trigger-webhook/${id}`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        return '';
    }

    __cardIdMenu() {
        const keys = Object.keys(this.customCards);
        return keys.length > 0 
            ? keys.map(key => ({ text: key, value: key }))
            : [{ text: '没有内容', value: '' }];
    }
}

Scratch.extensions.register(new Feishu());
