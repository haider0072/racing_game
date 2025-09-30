# Nissan GT-R R35 (2024) - Real-World Specifications

## Performance Metrics

### Acceleration
- **0-100 km/h**: 3.2-3.3 seconds
- **0-60 mph**: 2.9-3.1 seconds
- **0-100 mph**: 6.9 seconds

### Top Speed
- **Maximum**: 315-320 km/h (196-199 mph)

### Braking
- **70-0 mph**: 44 meters (145 feet)
- **100-0 km/h**: ~35-40 meters (estimated)

## Physical Specifications

### Weight & Dimensions
- **Curb Weight**: 1,773 kg (3,908 lbs)
- **Weight Distribution**: ~55% front / 45% rear
- **Length**: 4,710 mm
- **Width**: 1,895 mm
- **Height**: 1,370 mm
- **Wheelbase**: 2,780 mm

### Engine & Drivetrain
- **Engine**: 3.8L Twin-Turbo V6 (VR38DETT)
- **Power**: 565 HP @ 6,800 RPM (Premium/T-Spec) | 600 HP (NISMO)
- **Torque**: 467 lb-ft @ 3,300-5,800 RPM
- **Drivetrain**: AWD (ATTESA E-TS)
- **Transmission**: 6-speed dual-clutch

## Aerodynamics

### Drag & Downforce
- **Drag Coefficient (Cd)**: 0.26
- **Frontal Area**: ~2.27 m²
- **Downforce**: Optimized for high-speed stability
- **Underbody**: Carbon fiber diffuser, heat-resistant under-covers

## Handling Characteristics

### Drivetrain Behavior
- **Type**: AWD with rear-bias (feels like RWD with AWD confidence)
- **Torque Split**: Variable (rear-biased under normal conditions)
- **Understeer/Oversteer**: Neutral to slight understeer (AWD system prevents oversteer)

### Suspension & Tires
- **Suspension**: Bilstein DampTronic with multiple modes
- **Tire Size**: 255/40ZR20 (front) | 285/35ZR20 (rear)
- **Brakes**: Brembo 6-piston front, 4-piston rear

## Target Values for Game Physics

### Acceleration
- **Target 0-100 km/h**: 3.2 seconds
- **Required acceleration value**: ~0.87 (tuned for 3.2s)

### Top Speed
- **Target maximum**: 315 km/h
- **Air drag coefficient**: 0.0003-0.0004 (scaled for game)

### Braking
- **Target 100-0 km/h**: ~2.5-3.0 seconds
- **Brake strength**: 0.90-0.93

### Weight & Grip
- **Mass**: 1773 kg
- **Lateral grip (AWD)**: 0.95-0.98 (higher than current 0.85)
- **Traction**: Excellent (AWD provides superior grip)

### Handling
- **Steering response**: Quick but stable
- **Turn radius**: Tight for a supercar
- **Stability**: Extremely stable at high speeds (AWD + aerodynamics)

## Current Game vs GT-R Target

| Metric | Current Game | GT-R Target | Status |
|--------|--------------|-------------|--------|
| 0-100 km/h | ~5-6s | 3.2s | ❌ Too slow |
| Top Speed | 150-180 km/h | 315 km/h | ❌ Too low |
| Braking 100-0 | ~2-3s | ~2.5-3s | ✅ Close |
| Mass | 500 kg | 1773 kg | ❌ Too light |
| Lateral Grip | 0.85 (RWD-like) | 0.95+ (AWD) | ❌ Needs AWD feel |
| Drag Coefficient | 0.0005 | 0.26 Cd real / 0.0003 game | ⚠️ Needs tuning |

## Implementation Priority

### Phase 1: Core Performance
1. ✅ Update mass to 1773 kg
2. ✅ Tune acceleration for 3.2s 0-100 km/h
3. ✅ Adjust drag for 315 km/h top speed
4. ✅ Increase lateral grip to 0.95-0.98 (AWD)

### Phase 2: GT-R Feel
5. Add AWD power distribution (understeer reduction)
6. Improve high-speed stability
7. Quick steering at low speeds
8. Very stable steering at high speeds

### Phase 3: Polish
9. Engine sound simulation
10. Gear shift simulation (6-speed DCT)
11. Visual weight transfer
12. Tire grip visualization

---

**Note**: These are real-world values. Game physics will use scaled/approximated versions to match feel and performance within the physics engine.
