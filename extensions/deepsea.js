(function (Scratch) {
  'use strict';

  class RandomExtension {
    getInfo() {
      return {
        id: 'randomExtension',
        name: '随机数测试',
        blocks: [
          {
            opcode: 'getRandom',
            blockType: Scratch.BlockType.REPORTER,
            text: '随机 1 到 100',
          },
          {
            opcode: 'rollDice',
            blockType: Scratch.BlockType.REPORTER,
            text: '掷骰子',
          },
        ],
      };
    }

    getRandom() {
      return Math.floor(Math.random() * 100) + 1;
    }

    rollDice() {
      return Math.floor(Math.random() * 6) + 1;
    }
  }

  Scratch.extensions.register(new RandomExtension());
})(Scratch);