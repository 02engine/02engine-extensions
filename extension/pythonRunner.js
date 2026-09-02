// Python Runner Extension for 02Engine/Scratch
// Powered by Pyodide - run Python in the browser
(function (Scratch) {
    class PythonExtension {
        constructor() {
            this._pyodide = null;
            this._loading = false;
            this._output = '';
            this._error = '';
        }

        getInfo() {
            return {
                id: 'pythonRunner',
                name: 'Python 运行器',
                color1: '#3776AB',
                color2: '#FFD43B',
                blocks: [
                    {
                        opcode: 'initPython',
                        text: '初始化 Python 环境',
                        blockType: Scratch.BlockType.COMMAND
                    },
                    {
                        opcode: 'isReady',
                        text: 'Python 环境已就绪？',
                        blockType: Scratch.BlockType.BOOLEAN
                    },
                    {
                        opcode: 'runCode',
                        text: '运行 Python 代码 [CODE]',
                        arguments: {
                            CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'print("Hello from Python!")'
                            }
                        },
                        blockType: Scratch.BlockType.COMMAND
                    },
                    {
                        opcode: 'evalCode',
                        text: '计算 Python 表达式 [CODE]',
                        arguments: {
                            CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '2 ** 10'
                            }
                        },
                        blockType: Scratch.BlockType.REPORTER
                    },
                    {
                        opcode: 'getOutput',
                        text: '获取输出',
                        blockType: Scratch.BlockType.REPORTER
                    },
                    {
                        opcode: 'getError',
                        text: '获取错误信息',
                        blockType: Scratch.BlockType.REPORTER
                    },
                    {
                        opcode: 'clearOutput',
                        text: '清空输出',
                        blockType: Scratch.BlockType.COMMAND
                    }
                ]
            };
        }

        async initPython() {
            if (this._pyodide) return;
            if (this._loading) return;
            this._loading = true;
            this._output = '';
            this._error = '';
            try {
                await this._loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');
                this._pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
                this._pyodide.runPython(`
import sys
from io import StringIO
class OutputCapture:
    def __init__(self):
        self.content = ""
    def write(self, text):
        self.content += text
    def flush(self):
        pass
_output_capture = OutputCapture()
sys.stdout = _output_capture
sys.stderr = _output_capture
`);
                this._loading = false;
            } catch (e) {
                this._error = '初始化失败: ' + e.message;
                this._loading = false;
            }
        }

        _loadScript(url) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${url}"]`)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = url;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        isReady() {
            return this._pyodide !== null && !this._loading;
        }

        async runCode(args) {
            if (!this._pyodide) {
                this._error = '请先初始化 Python 环境';
                return;
            }
            const code = Scratch.Cast.toString(args.CODE);
            this._error = '';
            try {
                this._pyodide.runPython('_output_capture.content = ""');
                await this._pyodide.runPythonAsync(code);
                this._output = this._pyodide.runPython('_output_capture.content');
            } catch (e) {
                this._error = e.message;
            }
        }

        async evalCode(args) {
            if (!this._pyodide) {
                this._error = '请先初始化 Python 环境';
                return '';
            }
            const code = Scratch.Cast.toString(args.CODE);
            this._error = '';
            try {
                const result = await this._pyodide.runPythonAsync(code);
                return String(result);
            } catch (e) {
                this._error = e.message;
                return '';
            }
        }

        getOutput() {
            return this._output;
        }

        getError() {
            return this._error;
        }

        clearOutput() {
            this._output = '';
            this._error = '';
        }
    }

    Scratch.extensions.register(new PythonExtension());
})(Scratch);
