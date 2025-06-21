/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function () {
    const Marzipano = window.Marzipano;
    const bowser = window.bowser;
    const data = window.RouterData;

    // Grab elements from DOM.
    const panoElement = document.querySelector('#pano');
    const sceneNameElement = document.querySelector('#titleBar .sceneName');
    const sceneListElement = document.querySelector('#sceneList');
    const sceneElements = document.querySelectorAll('#sceneList .scene');
    const sceneListToggleElement = document.querySelector('#sceneListToggle');
    const autorotateToggleElement = document.querySelector('#autorotateToggle');

    // Detect desktop or mobile mode.
    if (window.matchMedia) {
        const setMode = function () {
            if (mql.matches) {
                document.body.classList.remove('desktop');
                document.body.classList.add('mobile');
            } else {
                document.body.classList.remove('mobile');
                document.body.classList.add('desktop');
            }
        };
        const mql = matchMedia("(max-width: 500px), (max-height: 500px)");
        setMode();
        mql.addListener(setMode);
    } else {
        document.body.classList.add('desktop');
    }

    // Detect whether we are on a touch device.
    document.body.classList.add('no-touch');
    window.addEventListener('touchstart', function () {
        document.body.classList.remove('no-touch');
        document.body.classList.add('touch');
    });

    // Viewer options.
    const viewerOpts = {
        controls: {
            mouseViewMode: data.settings.mouseViewMode
        }
    };

    // Initialize viewer.
    const viewer = new Marzipano.Viewer(panoElement, viewerOpts);

    // Create scenes.
    const scenesContainer = document.querySelector('.scenes');
    const scenes = data.scenes.map(function (data) {
        addSceneIntoSceneListElement(scenesContainer, data)
        const urlPrefix = "tiles";
        const source = Marzipano.ImageUrlSource.fromString(
            urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
            {cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg"});
        const geometry = new Marzipano.CubeGeometry(data.levels);

        const limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
        const view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

        const scene = viewer.createScene({
            source: source,
            geometry: geometry,
            view: view,
            pinFirstLevel: true
        });

        // Create link hotspots.
        data.linkHotspots.forEach(function (hotspot) {
            const element = createLinkHotspotElement(hotspot);
            scene.hotspotContainer().createHotspot(element, {yaw: hotspot.yaw, pitch: hotspot.pitch});
        });

        // 不再支持Info热点

        return {
            data: data,
            scene: scene,
            view: view
        };
    });

    // Set up autorotate, if enabled.
    const autorotate = Marzipano.autorotate({
        yawSpeed: 0.03,
        targetPitch: 0,
        targetFov: Math.PI / 2
    });
    if (data.settings.autorotateEnabled) {
        autorotateToggleElement.classList.add('enabled');
    }

    // Set handler for autorotate toggle.
    autorotateToggleElement.addEventListener('click', toggleAutorotate);

    // Set handler for scene list toggle.
    sceneListToggleElement.addEventListener('click', toggleSceneList);

    // Start with the scene list open on desktop.
    if (!document.body.classList.contains('mobile')) {
        showSceneList();
    }

    // Set handler for scene switch.
    scenes.forEach(function (scene) {
        const el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
        el.addEventListener('click', function () {
            switchScene(scene);
            // On mobile, hide scene list after selecting a scene.
            if (document.body.classList.contains('mobile')) {
                hideSceneList();
            }
        });
    });

    function addSceneIntoSceneListElement(scenesContainer, data) {
        // 创建 a 元素
        const anchor = document.createElement('a');
        anchor.href = 'javascript:void(0)';
        anchor.className = 'scene';
        anchor.dataset.id = data.id; // 设置 data-id 属性

        // 创建 li 元素
        const li = document.createElement('li');
        li.className = 'text';
        li.textContent = data.name;

        // 组装元素
        anchor.appendChild(li);
        scenesContainer.appendChild(anchor);
    }

    function sanitize(s) {
        return s.replace('&', '&amp;').replace('<', '&草坪;').replace('>', '&gt;');
    }

    // 判断文件是否存在的函数
    function fileExists(url) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    resolve(xhr.status === 200);
                }
            };
            xhr.send();
        });
    }

// 创建场景信息按钮
    function createSceneInfoButton(sceneName) {
        // 移除之前的按钮（如果存在）
        const existingButton = document.getElementById('sceneInfoButton');
        if (existingButton) {
            existingButton.remove();
        }

        // 移除之前的iframe（如果存在）
        const existingFrame = document.getElementById('sceneInfoFrame');
        if (existingFrame) {
            existingFrame.remove();
        }

        // 创建新按钮
        const button = document.createElement('div');
        button.id = 'sceneInfoButton';
        button.innerHTML = '查看场景信息';
        button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    z-index: 100;
    font-size: 16px;
  `;

        button.addEventListener('click', () => {
            toggleSceneInfoFrame(sceneName);
        });

        document.body.appendChild(button);
    }

// 切换场景信息框架的显示状态
    function toggleSceneInfoFrame(sceneName) {
        let frame = document.getElementById('sceneInfoFrame');

        if (frame) {
            // 如果框架已存在，则切换其可见性
            if (frame.style.height === '50%') {
                frame.style.height = '0';
                setTimeout(() => {
                    frame.remove();
                }, 300);
            } else {
                frame.style.height = '50%';
            }
        } else {
            // 创建新框架
            frame = document.createElement('div');
            frame.id = 'sceneInfoFrame';
            frame.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 0;
      background-color: white;
      z-index: 99;
      transition: height 0.3s ease;
      overflow: hidden;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
    `;

            // 创建关闭按钮
            const closeButton = document.createElement('div');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 24px;
      cursor: pointer;
      color: #333;
      z-index: 101;
    `;
            closeButton.addEventListener('click', () => {
                frame.style.height = '0';
                setTimeout(() => {
                    frame.remove();
                }, 300);
            });

            // 创建iframe
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
            iframe.src = `sense/${sceneName}/index.html`;

            frame.appendChild(closeButton);
            frame.appendChild(iframe);
            document.body.appendChild(frame);

            // 延迟设置高度以触发过渡效果
            setTimeout(() => {
                frame.style.height = '50%';
            }, 10);
        }
    }

// 修改switchScene函数，添加对场景HTML的检查
    function switchScene(scene) {
        stopAutorotate();
        scene.view.setParameters(scene.data.initialViewParameters);
        scene.scene.switchTo();
        startAutorotate();
        updateSceneName(scene);
        updateSceneList(scene);

        // 获取场景名称并检查对应的HTML是否存在
        const sceneName = scene.data.name;
        checkSceneInfoAvailable(sceneName);
    }

// 检查场景信息HTML是否可用
    async function checkSceneInfoAvailable(sceneName) {
        const sceneInfoPath = `/public/jsshader/sense/${sceneName}/index.html`;
        const exists = await fileExists(sceneInfoPath);

        if (exists) {
            createSceneInfoButton(sceneName);
        } else {
            // 移除按钮（如果存在）
            const existingButton = document.getElementById('sceneInfoButton');
            if (existingButton) {
                existingButton.remove();
            }

            // 移除iframe（如果存在）
            const existingFrame = document.getElementById('sceneInfoFrame');
            if (existingFrame) {
                existingFrame.remove();
            }
        }
    }

// 添加必要的CSS
    const style = document.createElement('style');
    style.textContent = `
  #sceneInfoButton:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
  
  @media (max-width: 768px) {
    #sceneInfoButton {
      font-size: 14px;
      padding: 8px 12px;
    }
  }
`;
    document.head.appendChild(style);

    function updateSceneName(scene) {
        sceneNameElement.innerHTML = sanitize(scene.data.name);
    }

    function updateSceneList(scene) {
        for (let i = 0; i < sceneElements.length; i++) {
            const el = sceneElements[i];
            if (el.getAttribute('data-id') === scene.data.id) {
                el.classList.add('current');
            } else {
                el.classList.remove('current');
            }
        }
    }

    function showSceneList() {
        sceneListElement.classList.add('enabled');
        sceneListToggleElement.classList.add('enabled');
    }

    function hideSceneList() {
        sceneListElement.classList.remove('enabled');
        sceneListToggleElement.classList.remove('enabled');
    }

    function toggleSceneList() {
        sceneListElement.classList.toggle('enabled');
        sceneListToggleElement.classList.toggle('enabled');
    }

    function startAutorotate() {
        if (!autorotateToggleElement.classList.contains('enabled')) {
            return;
        }
        viewer.startMovement(autorotate);
        viewer.setIdleMovement(3000, autorotate);
    }

    function stopAutorotate() {
        viewer.stopMovement();
        viewer.setIdleMovement(Infinity);
    }

    function toggleAutorotate() {
        if (autorotateToggleElement.classList.contains('enabled')) {
            autorotateToggleElement.classList.remove('enabled');
            stopAutorotate();
        } else {
            autorotateToggleElement.classList.add('enabled');
            startAutorotate();
        }
    }

    function createLinkHotspotElement(hotspot) {
        const scene = findSceneDataById(hotspot.target);
        const targetSceneName = scene.name;

        // 创建包装元素
        const wrapper = document.createElement('div');
        wrapper.className = 'compact-hotspot';

        // 创建内容元素
        const content = document.createElement('div');
        content.className = 'hotspot-content';

        // 场景名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'scene-name';
        nameSpan.textContent = targetSceneName;

        // 箭头图标
        const icon = document.createElement('span');
        icon.className = 'arrow-icon';
        icon.innerHTML = '➔'; // 使用字符图标替代图片

        content.appendChild(nameSpan);
        content.appendChild(icon);
        wrapper.appendChild(content);

        // 点击事件
        wrapper.addEventListener('click', function(e) {
            e.stopPropagation();
            switchScene(findSceneById(hotspot.target));
        });

        return wrapper;
    }

    function findSceneById(id) {
        for (let i = 0; i < scenes.length; i++) {
            if (scenes[i].data.id === id) {
                return scenes[i];
            }
        }
        return null;
    }

    function findSceneDataById(id) {
        for (let i = 0; i < data.scenes.length; i++) {
            if (data.scenes[i].id === id) {
                return data.scenes[i];
            }
        }
        return null;
    }

    // Display the initial scene.
    switchScene(scenes[0]);

})();