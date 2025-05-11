<template>
  <div class="multiple-scenes">
    <div id="pano"></div>

    <div id="sceneList">
      <ul class="scenes">
        <a
            v-for="scene in sceneData"
            :key="scene.id"
            href="javascript:void(0)"
            class="scene"
            :class="{ current: currentSceneId === scene.id }"
            @click="switchScene(scene)"
        >
          <li class="text">{{ scene.name }}</li>
        </a>
      </ul>
    </div>

    <div id="titleBar">
      <h1 class="sceneName">{{ currentSceneName }}</h1>
    </div>

    <a href="javascript:void(0)" id="autorotateToggle" @click="toggleAutorotate">
      <img class="icon off" src="img/play.png">
      <img class="icon on" src="img/pause.png">
    </a>

    <a href="javascript:void(0)" id="sceneListToggle" @click="toggleSceneList">
      <img class="icon off" src="img/expand.png">
      <img class="icon on" src="img/collapse.png">
    </a>
  </div>
</template>

<script>
import {RouterData} from './data.js'

export default {
  data() {
    return {
      currentSceneId: null,
      currentSceneName: '',
      sceneData: RouterData.scenes,
      viewer: null,
      autorotate: null,
      isAutorotateEnabled: RouterData.settings.autorotateEnabled
    }
  },

  mounted() {
    this.initMarzipano()
  },

  methods: {
    initMarzipano() {
      const Marzipano = window.Marzipano
      const bowser = window.bowser
      const screenfull = window.screenfull

      // 初始化Viewer
      this.viewer = new Marzipano.Viewer(document.querySelector('#pano'), {
        controls: {mouseViewMode: RouterData.settings.mouseViewMode}
      })

      // 初始化自动旋转
      this.autorotate = Marzipano.autorotate({
        yawSpeed: 0.03,
        targetPitch: 0,
        targetFov: Math.PI / 2
      })

      // 创建场景
      this.scenes = []
      RouterData.scenes.map(sceneData => {
        const source = Marzipano.ImageUrlSource.fromString(
            `tiles/${sceneData.id}/{z}/{f}/{y}/{x}.jpg`,
            {cubeMapPreviewUrl: `tiles/${sceneData.id}/preview.jpg`}
        )

        const geometry = new Marzipano.CubeGeometry(sceneData.levels)
        const view = new Marzipano.RectilinearView(
            sceneData.initialViewParameters,
            Marzipano.RectilinearView.limit.traditional(
                sceneData.faceSize,
                100 * Math.PI / 180,
                120 * Math.PI / 180
            )
        )

        const scene = this.viewer.createScene({
          source,
          geometry,
          view,
          pinFirstLevel: true
        })

        this.scenes.push({data: sceneData, scene, view})

        // TODO
        // 添加热点
        sceneData.linkHotspots.forEach(hotspot => {
          const el = this.createLinkHotspot(hotspot)
          scene.hotspotContainer().createHotspot(el, {yaw: hotspot.yaw, pitch: hotspot.pitch})
        })
        //
        // sceneData.infoHotspots.forEach(hotspot => {
        //   const el = this.createInfoHotspot(hotspot)
        //   scene.hotspotContainer().createHotspot(el, {yaw: hotspot.yaw, pitch: hotspot.pitch})
        // })

        return {data: sceneData, scene, view}
      })

      // 初始场景
      if (this.scenes.length > 0) {
        this.switchScene(this.scenes[0])
      }
    },

    createLinkHotspot(hotspot) {
      const element = document.createElement('div')
      element.className = 'hotspot link-hotspot'

      const icon = document.createElement('img')
      icon.src = '/img/link.png'
      icon.className = 'link-hotspot-icon'
      icon.style.transform = `rotate(${hotspot.rotation}rad)`

      const tooltip = document.createElement('div')
      tooltip.className = 'hotspot-tooltip link-hotspot-tooltip'
      // tooltip.textContent = this.getSceneById(hotspot.target).name
      tooltip.textContent = "this.getSceneById(hotspot.target).name"

      element.appendChild(icon)
      element.appendChild(tooltip)

      element.addEventListener('click', () => {
        this.switchScene(this.getSceneById(hotspot.target))
      })

      return element
    },

    createInfoHotspot(hotspot) {
      const wrapper = document.createElement('div')
      wrapper.className = 'hotspot info-hotspot'

      // 创建热点内容（同原始实现）
      // ... 保持原有DOM创建逻辑

      return wrapper
    },

    switchScene(targetScene) {
      this.currentSceneId = targetScene.data.id
      this.currentSceneName = this.sanitize(targetScene.data.name)

      targetScene.view.setParameters(targetScene.data.initialViewParameters)
      targetScene.scene.switchTo()
      this.handleAutorotate()
    },

    handleAutorotate() {
      if (this.isAutorotateEnabled) {
        this.viewer.startMovement(this.autorotate)
        this.viewer.setIdleMovement(3000, this.autorotate)
      } else {
        this.viewer.stopMovement()
        this.viewer.setIdleMovement(Infinity)
      }
    },

    toggleAutorotate() {
      this.isAutorotateEnabled = !this.isAutorotateEnabled
      this.handleAutorotate()
    },

    toggleSceneList() {
      const list = document.getElementById('sceneList')
      const toggleBtn = document.getElementById('sceneListToggle')
      list.classList.toggle('enabled')
      toggleBtn.classList.toggle('enabled')
    },

    getSceneById(id) {
      return this.scenes.find(scene => scene.data.id === id)
    },

    sanitize(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }
}
</script>

<style scoped>
/* 基础样式 */
.multiple-scenes {
  position: relative;
  width: 100%;
  height: 100vh;
}

#pano {
  width: 100%;
  height: 100%;
}

/* 导入原有样式 */
@import 'style.css';
</style>