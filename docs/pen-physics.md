# Pen physics and research

## Matador All Time

Added using `matador_all_time_mobile_posted.glb` from the user-supplied `matador_all_time_complete_pack.zip`, installed unchanged at `public/models/pens/matador-all-time.glb`. The posted variant retains the rear cap, transparent ribbed grip, amber trim and embedded branding, with about 11,942 triangles rather than the detailed model's 42,350. The supplied pack describes its dimensions as visual estimates, not factory measurements; source length is approximately 149 mm. The game scales it to the existing board and pen system.

### What the research establishes

Checked on 26 October 2026:

- [Matador's official All-time product page](https://matador.com.bd/stationery/product/matador-all-time) describes a transparent body, six cap colours, refillability, oil-based gel ink and a 0.7 mm NS tip with a tungsten-carbide ball.
- [Matador's official shop](https://eshop.matador.com.bd/) repeats those construction and writing specifications.
- Neither official source publishes individual pen mass, barrel polymer, measured sliding/rolling friction against a wooden desk, or restitution. No reliable product-specific measurements were found in the searches. Writing smoothness is not a measurement of barrel-on-desk friction. The supplied model's metallic appearance is not evidence that the actual barrel is metal.

### Implemented game estimates

These are conservative gameplay estimates consistent with the existing catalogue, **not measured real-world specifications**. Mass is relative to the generic Ball Pen's 1.0; it is not grams or kilograms. Friction is the engine's effective dimensionless sliding coefficient, multiplied by the player's global friction setting. No unverified gram value is assigned.

| Parameter                | Value       | Reason                                                                                                          |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Relative mass            | 0.92        | Lightweight refillable pen; slightly below High School's 0.95                                                   |
| Sliding friction (`mu`)  | 0.32        | Near High School's 0.31, allowing modest extra drag for ribbed surfaces                                         |
| Restitution (`e`)        | 0.58        | Moderate impact bounce, slightly below High School's 0.60                                                       |
| Flick speed multiplier   | 1.01        | Keeps the light pen close to the standard flick response                                                        |
| Spin multiplier          | 1.15        | Moderate spin for the narrow, round body and posted cap                                                         |
| Roll configuration       | 0.68        | Within the existing Matador range; the current classic solver computes motion using its shared slide/roll model |
| Playable length / radius | 20.5 / 0.93 | Board-scaled dimensions for readability and collision consistency, not measured centimetres                     |

A deterministic isolated 35% axial flick from `(30,70)` stops after about **9.80 game units** for All Time versus **9.60** for High School and **9.56** for Smoothy at default settings. This gives All Time a small mobility difference without making it an extreme low-friction pen. The regular physics tests cover every opponent, both friction limits and both realism settings; scene tests cover geometry, cap colour, preserved materials, disposal, and recorded edge/corner falls.

To replace these estimates with measurements, weigh an assembled pen with its posted cap, then measure sliding deceleration on the intended desk (`mu = a/g`) and rebound speed ratio for restitution. Use those observations to recalibrate all pens on a consistent mass/length scale. There is no single universally best friction value independent of desk finish and contact orientation.

## Matador i-teen (gel variant)

Added using the unchanged `matador_i_teen_posted.glb` in `Downloads/matador_i_teen_game_assets.zip`. The archive named in the request, `matador_all_time_complete_pack.zip`, contains only All Time models; the matching i-teen pack was found in the same Downloads folder. The posted model has 112 mesh parts and 9,348 triangles. Its clear cap, transparent shell, raised grip dots, steel point and embedded white MATADOR/i-teen/water-gel lettering are preserved. Only the coloured barrel/core, shaded feeder and visible ink are recoloured. Source -Y points along game +X; +Z printing faces up. Supplied geometry dimensions are approximations from images, not physical measurements.

### Research and uncertainty

Checked on 26 October 2026:

- [Matador's official shop](https://eshop.matador.com.bd/) lists the **i-teen Gelpen** with Japanese waterproof gel ink, a 0.6 mm stainless-steel tip and tungsten-carbide ball, refillability and four body colours. This is the variant represented by the supplied water-gel model.
- [Matador's separate i-teen ballpen page](https://matador.com.bd/stationery/product/matador-i-teen) instead lists oil-based gel ink and a 0.7 mm tip. It must not be substituted for the gel version's specifications.
- Searches found retailer claims of approximately 10 g for the **ballpen**, with inconsistent pack weights. No authoritative individual mass was found for this gel variant. Those claims are not used as a measured gel-pen mass.
- No product-specific sliding friction, rolling resistance or restitution measurement against a wooden desk was found. Writing smoothness does not establish desk friction.

### Implemented game estimates

| Parameter                | Value    | Tuning rationale                                                                                                                                     |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relative mass            | 1.02     | Near the generic Ball/Gel baseline of 1.0; a modest handling difference, not grams or a measured specification                                       |
| Sliding friction (`mu`)  | 0.33     | Slightly above All Time's 0.32 to give the dotted-grip design a more controlled slide; an effective estimate, dependent on the desk and contact pose |
| Restitution (`e`)        | 0.60     | Moderate bounce within the Matador range                                                                                                             |
| Flick speed multiplier   | 0.98     | Controlled launch rather than an added power advantage                                                                                               |
| Spin multiplier          | 1.20     | Between High School's 1.18 and Smoothy's 1.24                                                                                                        |
| Roll configuration       | 0.65     | Consistent with the catalogue; the current classic solver uses shared slide/roll dynamics                                                            |
| Playable length / radius | 21 / 1.0 | Board-scaled visual and collision dimensions, not measured centimetres                                                                               |

These are a tested game starting point, not a claim of uniquely best physical constants. Exact values require weighing this assembled gel pen and measuring deceleration/rebound on the intended tabletop. The generic mass reference has no established gram conversion, so assigning 0.010 kg directly would be inconsistent with the current physics system.

At default settings, the same isolated 35% axial flick used for All Time travels about **7.99 game units** for i-teen, versus **8.46** for the generic Gel Pen and **9.60** for High School. All settle without falling, giving i-teen a modest control-oriented difference in this scenario. Collision tests cover every opponent, both friction limits and realism modes; geometry tests cover the supplied mesh, preserved translucent materials, independent player colours/resources, and recorded edge/corner falls.

## i-teen photo-based visual refinement

On 26 October 2026, image search located [Matador's official red i-teen gel-pen photograph](https://eshop.matador.com.bd/assets/images/product_image/1570346461hRUg0RD.png) and [Matador distributor product photographs](https://www.maxindustry.pk/products/matador-iteen-gel-pen). The official image shows a narrow clear cap, saturated coloured core, subtle grip moulding and compact white branding. Its approximate image ratios guide the cap shell (27% of overall length, 1.12 times barrel diameter), grip profile, low dots, tapered clip and rear plug. The printed field is shortened to approximately 40% of total length, near the rear. Material changes reduce the milky appearance of overlapping clear surfaces. These are visual estimates rather than calibrated physical measurements; physics values and barrel fitting remain as before.

## All Time clear-barrel colouring

On 26 October 2026, [Matador's official All-time page](https://matador.com.bd/stationery/product/matador-all-time) and its [product photograph](https://matador.com.bd/stationery/admin/uploads/product/matador-all-time-black/1666090708xq98C.jpg) confirmed a transparent barrel with a dark visible refill and matching coloured cap/end plug. The supplied GLB's silver barrel, metallic decorative channels and grip are therefore rendered as neutral clear plastic. The inner refill stays opaque and dark, independently of the selected colour. The cap/clip, rear plug and lower tip housing share the selected end colour, including the source model's amber parts. The steel nib and white branding remain intact. Menu previews and the End colour label use the same colour separation. These rendering changes preserve the model geometry and gameplay physics.

A further i-teen silhouette pass checked the official product photo against [additional red gel-pen photographs](https://www.maxindustry.pk/products/matador-iteen-gel-pen). The cap now has a closed faceted crown, a curved spring clip with a rounded hooked end and a side-facing posted orientation. The nose and steel point use more detailed taper/step profiles while retaining their existing span and diameter. Clear surfaces have angle-dependent edge reflections, and the coloured core has a softer plastic finish. These are visual refinements of the gel variant, not the differently shaped i-teen Grip ballpen; they do not change gameplay physics.
