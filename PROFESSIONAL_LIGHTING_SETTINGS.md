# Professional Lighting Settings

## Research Summary
Based on modern racing games (Forza Motorsport, Gran Turismo 7) and Three.js best practices:

### Key Findings
1. **Forza Motorsport** uses Ray-Traced Global Illumination (RTGI) for realistic indirect lighting
2. **Outdoor lighting** in games uses realistic values: 120,000 lux for bright sunlight
3. **HDR Environment Maps** provide realistic reflections faster than multiple lights
4. **Tone Mapping** (ACESFilmic) is essential for realistic color representation
5. **PBR Materials** with proper roughness/metalness create photorealistic surfaces

## Implemented Settings

### 1. Renderer Configuration
```javascript
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**Why:** ACESFilmic tone mapping is industry standard, used in Unreal Engine and many AAA games.

### 2. Lighting Setup

#### Ambient Light
- **Intensity:** 0.4 (reduced from 1.0)
- **Color:** #404040 (dark gray)
- **Purpose:** Soft fill light, keeps shadows from being pure black

**Why:** Lower ambient = more dramatic shadows, more realistic outdoor lighting

#### Directional Light (Sun)
- **Intensity:** 2.5 (increased from 1.2)
- **Color:** #fff5e6 (warm white, simulates sunlight)
- **Position:** (100, 80, 50) - high angle
- **Purpose:** Main light source, realistic sun

**Why:** Higher intensity mimics real outdoor sunlight intensity (scaled for WebGL)

#### Hemisphere Light (NEW)
- **Sky Color:** #87ceeb (light blue)
- **Ground Color:** #8B7355 (earth brown)
- **Intensity:** 0.6
- **Purpose:** Simulates sky/ground light bounce

**Why:** Adds realistic color tinting from sky reflection and ground bounce

### 3. Shadow Quality

```javascript
shadow.mapSize: 4096x4096 (up from 2048)
shadow.bias: -0.0001 (prevents shadow acne)
shadow.normalBias: 0.02 (reduces peter-panning)
shadow.camera frustum: 150 units (covers larger area)
```

**Why:** 4K shadows provide sharp, clean edges. Proper bias values eliminate artifacts.

### 4. HDR Environment Map

```javascript
Source: Poly Haven - aerodynamics_workshop_1k.hdr
Mapping: EquirectangularReflectionMapping
scene.environment: Applied globally
scene.environmentIntensity: 1.0
```

**Why:**
- Provides realistic reflections on car paint and windows
- Faster than multiple point lights
- Creates natural ambient occlusion
- Free resource from Poly Haven (CC0 license)

### 5. Material Properties

#### Asphalt Track
```javascript
color: 0x1a1a1a (darker, more realistic)
roughness: 0.85 (slightly reflective when wet-looking)
metalness: 0.0 (not metallic)
envMapIntensity: 0.3 (subtle reflections)
```

#### Grass
```javascript
color: 0x2d5a2d (realistic green)
roughness: 0.95 (very matte)
metalness: 0.0
envMapIntensity: 0.1 (minimal reflections)
```

## Performance Impact

- **4K Shadows:** ~5-10 FPS drop (acceptable for quality gain)
- **HDR Environment:** Minimal impact (~1-2 FPS), loads async
- **Tone Mapping:** No performance impact
- **Expected FPS:** 50-60 FPS on mid-range GPUs

## Comparison: Before vs After

| Setting | Before | After | Impact |
|---------|--------|-------|--------|
| Ambient Intensity | 1.0 | 0.4 | More dramatic shadows |
| Sun Intensity | 1.2 | 2.5 | Brighter, more realistic |
| Shadow Resolution | 2048 | 4096 | Sharper shadow edges |
| Tone Mapping | None | ACESFilmic | Realistic color/HDR |
| Environment Map | None | HDR | Realistic reflections |
| Hemisphere Light | None | Added | Sky/ground color bounce |

## Tuning Controls

The lighting control panel allows real-time adjustment of:
- Ambient light intensity (0-3)
- Sun intensity (0-5)
- Sun position X/Y/Z
- Shadow map size (1024/2048/4096)
- Shadow bias adjustment

Use "📋 Log to Console" to export current values.
Use "🔄 Reset Defaults" to restore professional settings.

## References

1. [Forza Motorsport RTGI](https://support.forzamotorsport.net/hc/en-us/articles/36119181383187)
2. [Three.js HDR Environment](https://discourse.threejs.org/t/live-envmaps-and-getting-realistic-studio-lighting-almost-for-free/35627)
3. [Physically-Based Lighting Values](https://www.siliconstudio.co.jp/middleware/enlighten/en/blog/2019/20190322/)
4. [Poly Haven HDRIs](https://polyhaven.com/hdris)

## Next Steps (Optional)

1. **Post-Processing:** Add bloom, SSAO, motion blur
2. **Dynamic Time of Day:** Animate sun position and color temperature
3. **Weather Effects:** Add rain, fog, clouds
4. **Track-Specific HDRIs:** Create custom environment maps for each track
