// ==UserScript==
// @name         QAS一键推送助手
// @namespace    https://github.com/Cp0204/quark-auto-save
// @license      AGPL
// @version      0.4
// @description  在夸克网盘分享页面添加推送到 QAS 的按钮
// @icon         https://pan.quark.cn/favicon.ico
// @author       Cp0204
// @match        https://pan.quark.cn/s/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @downloadURL  https://cdn.jsdelivr.net/gh/Cp0204/quark-auto-save@refs/heads/main/app/static/js/qas.addtask.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cp0204/quark-auto-save@refs/heads/main/app/static/js/qas.addtask.user.js
// ==/UserScript==

(function () {
    'use strict';

    let qas_base = GM_getValue('qas_base', '');
    let qas_token = GM_getValue('qas_token', '');
    let default_pattern = GM_getValue('default_pattern', '');
    let default_replace = GM_getValue('default_replace', '');

    // QAS 设置弹窗函数
    function showQASSettingDialog(callback) {
        Swal.fire({
            title: 'QAS 设置',
            showCancelButton: true,
            html: `
                <label for="qas_base">QAS 地址</label>
                <input id="qas_base" class="swal2-input" placeholder="如: http://192.168.1.8:5005" value="${qas_base}"><br>
                <label for="qas_token">QAS Token</label>
                <input id="qas_token" class="swal2-input" placeholder="v0.5+ 系统配置中查找" value="${qas_token}"><br>
                <label for="qas_token">默认正则</label>
                <input id="default_pattern" class="swal2-input" placeholder="如 $TV" value="${default_pattern}"><br>
                <label for="qas_token">默认替换</label><input id="default_replace" class="swal2-input" value="${default_replace}">
            `,
            focusConfirm: false,
            preConfirm: () => {
                qas_base = document.getElementById('qas_base').value;
                qas_token = document.getElementById('qas_token').value;
                default_pattern = document.getElementById('default_pattern').value;
                default_replace = document.getElementById('default_replace').value;
                if (!qas_base || !qas_token) {
                    Swal.showValidationMessage('请填写 QAS 地址和 Token');
                }
                return { qas_base: qas_base, qas_token: qas_token, default_pattern: default_pattern, default_replace: default_replace }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                GM_setValue('qas_base', result.value.qas_base);
                GM_setValue('qas_token', result.value.qas_token);
                GM_setValue('default_pattern', result.value.default_pattern);
                GM_setValue('default_replace', result.value.default_replace);
                qas_base = result.value.qas_base;
                qas_token = result.value.qas_token;
                default_pattern = result.value.default_pattern;
                default_replace = result.value.default_replace;
                if (callback) {
                    callback(); // 执行回调函数
                }
            }
        });
    }

    // 添加 QAS 设置按钮
    function addQASSettingButton() {
        function waitForElement(selector, callback) {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else {
                setTimeout(() => waitForElement(selector, callback), 500);
            }
        }

        waitForElement('.DetailLayout--client-download--FpyCkdW.ant-dropdown-trigger', (clientDownloadButton) => {
            const qasSettingButton = document.createElement('div');
            qasSettingButton.className = 'DetailLayout--client-download--FpyCkdW ant-dropdown-trigger';
            qasSettingButton.innerHTML = 'QAS设置';

            qasSettingButton.addEventListener('click', () => {
                showQASSettingDialog();
            });

            clientDownloadButton.parentNode.insertBefore(qasSettingButton, clientDownloadButton.nextSibling);
        });
    }

    // 推送到 QAS 按钮
    function addQASButton() {
        function waitForElement(selector, callback) {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else {
                setTimeout(() => waitForElement(selector, callback), 500);
            }
        }

        waitForElement('.ant-btn.share-save', (saveButton) => {
            const qasButton = document.createElement('button');
            qasButton.type = 'button';
            qasButton.className = 'ant-btn share-save';
            qasButton.style.marginLeft = '10px';
            qasButton.innerHTML = '<span class="share-save-ico"></span><span>创建QAS任务</span>';

            let taskname, shareurl, savepath; // 声明变量

            // 获取数据函数
            function getData() {
                const currentUrl = window.location.href;
                taskname = currentUrl.lastIndexOf('-') > 0 ? decodeURIComponent(currentUrl.match(/.*\/[^-]+-(.+)$/)[1]).replace('*101', '-') : document.querySelector('.author-name').textContent;
                shareurl = currentUrl;
                let pathElement = document.querySelector('.path-name');
                savepath = pathElement ? pathElement.title.replace('全部文件', '').trim() : "";
                savepath += "/" + taskname;
                qasButton.title = `任务名称: ${taskname}\n分享链接: ${shareurl}\n保存路径: ${savepath}`;
            }


            // 添加鼠标悬停事件
            qasButton.addEventListener('mouseover', () => {
                getData(); // 鼠标悬停时获取数据
            });


            // 添加点击事件
            qasButton.addEventListener('click', () => {
                getData(); // 点击时重新获取数据，确保最新

                // 检查 qas_base 是否包含 http 或 https，如果没有则添加 http://
                let qasApiBase = qas_base;
                if (!qasApiBase.startsWith('http')) {
                    qasApiBase = 'http://' + qasApiBase;
                }
                const apiUrl = `${qasApiBase}/api/add_task?token=${qas_token}`;

                const data = {
                    "taskname": taskname,
                    "shareurl": shareurl,
                    "savepath": savepath,
                    "pattern": default_pattern,
                    "replace": default_replace,
                };

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: apiUrl,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(data),
                    onload: function (response) {
                        try {
                            const jsonResponse = JSON.parse(response.responseText);
                            if (jsonResponse.success) {
                                Swal.fire({
                                    title: '任务创建成功',
                                    html: `<small>
                                           <b>任务名称:</b> ${taskname}<br><br>
                                           <b>保存路径:</b> ${savepath}<br><br>
                                           <a href="${qasApiBase}" target="_blank">去 QAS 查看</a>
                                           <small>`,
                                    icon: 'success'
                                });
                            } else {
                                Swal.fire({
                                    title: '任务创建失败',
                                    text: jsonResponse.message,
                                    icon: 'error'
                                });
                            }
                        } catch (e) {
                            Swal.fire({
                                title: '解析响应失败',
                                text: `无法解析 JSON 响应: ${response.responseText}`,
                                icon: 'error'
                            });
                        }
                    },
                    onerror: function (error) {
                        Swal.fire({
                            title: '任务创建失败',
                            text: error,
                            icon: 'error'
                        });
                    }
                });
            });

            saveButton.parentNode.insertBefore(qasButton, saveButton.nextSibling);
        });
    }

    // 初始化
    (function init() {
        addQASSettingButton();

        if (!qas_base || !qas_token) {
            showQASSettingDialog(() => {
                addQASButton(); // 在设置后添加 QAS 按钮
            });
        } else {
            addQASButton(); // 如果配置存在，则直接添加 QAS 按钮
        }
    })(); // 立即执行初始化
})();
