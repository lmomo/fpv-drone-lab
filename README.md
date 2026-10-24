# FPV 穿越机 3D 拆解演示（FPV Drone Lab）

一个纯前端的 5 寸 FPV 穿越机交互式 3D 拆解页面。全部几何体由 Three.js 程序化生成，**不依赖任何外部模型或贴图文件**。所有参数均为“演示配置 / 参考参数 / 演示估算”，不代表任何真实品牌产品。

## 运行方式

需要联网（Three.js 通过 CDN importmap 加载：`three@0.160.0`，unpkg.com）。

```bash
cd fpv-drone-lab
python3 -m http.server 8000
```

然后用 Chrome（或 Edge）打开 <http://localhost:8000/>。

> 不要直接双击 `index.html`（file:// 协议下 ES Module 会被浏览器拦截）。
> 首次访问会弹出操作引导；URL 加 `?noguide` 可跳过。

## 功能概览

- **模型**：220 mm 轴距 X 型机架（底板 / 顶板 / 4 机臂 / 铝立柱 / 摄像头侧板 / TPU 天线座）、4 × 2207 电机（独立 ID，镂空转子可旋转）、CW / CCW 5 寸三叶桨（带扭转角）、30.5 mm 飞控与四合一电调、电源滤波电容、6S 1300 mAh 电池（绑带、防滑垫、XT60）、摄像头及镜头组、数字图传与双天线、接收机及 T 形天线、蜂鸣器、LED 灯条、TubeGeometry 动态线缆、InstancedMesh 紧固件。
- **层级**：`DroneRoot → FrameAssembly / PropulsionAssembly / AvionicsAssembly / PowerAssembly / CameraVTXAssembly / RFAssembly / WiringAssembly → 部件 Group`。
- **数据驱动**：`js/data.js` 统一维护部件清单、参数（带“演示配置 / 参考参数 / 可编辑 / 未配置 / 演示估算”标签）、连接关系与拆解序列。
- **左侧部件清单**：分组、搜索筛选、显隐切换、与 3D 视图双向选中同步；电机 / 螺旋桨 / 机臂可单选或整组选中。
- **右侧详情**：按部件类型显示不同字段；未选中时显示整机概览（总重、续航估算等）；电机 KV、电池容量可编辑（保存在本地浏览器）。
- **拆解动画**：6 个阶段依次拆解；进度条 0–100% 为插值而非累加，可任意拖动；支持播放 / 暂停 / 单步前进 / 后退 / 阶段跳转 / 单部件拆解 / 全部复原，动画可随时中断。
- **交互**：点击拾取（高亮不破坏原材质，Shift 加选）、双击按包围盒聚焦、7 个视角预设平滑过渡、HTML 标签投影与避让、逻辑连接线高亮 / 变暗。
- **工程视图**：标准 / 半透明机架 / 隐藏外部结构 / 仅电子模块 / 仅动力系统 / 内部连接关系。
- **其他**：首次引导、WebGL / CDN 加载失败提示、DPR 上限 2、自适应尺寸、渐隐网格地面、展示台与阴影。

## 快捷键

| 键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← / → | 上一步 / 下一步 |
| F | 聚焦选中部件 |
| H | 隐藏选中部件 |
| Esc | 取消选择 |

## 目录结构

```
index.html            页面骨架、importmap、启动错误处理
css/style.css         深色主题样式
js/config.js          基准尺寸、布局与配色
js/data.js            部件数据、阶段、连接关系
js/scene.js           渲染器、灯光、环境、地面与展示台
js/animation.js       补间、拆解控制器、状态机
js/interaction.js     拾取、高亮、工程视图、聚焦、视角预设
js/labels.js          3D 标签
js/connections.js     逻辑连接线
js/ui.js              界面逻辑
js/main.js            应用入口
js/model/*.js         程序化建模（机架、动力、电子、电源、天线、线缆、紧固件、材质、贴图）
```

## 已知限制

- 模型为结构示意级别，非 CAD 精度；线缆在拆解时按端点实时重建，拉伸过长时显示为“已断开”线头。
- 重量、续航为简化公式估算，仅供演示。
- 需要联网访问 unpkg CDN；离线环境请自行把 three 0.160.0 放到本地并修改 importmap。
