// ======================================================
// TURKEY — TR_GLiM vs TR_MTA
// Visualization + Area Statistics + Three Validation Measures
// (1) Spatial area-weighted agreement
// (2) Lithological composition similarity
// (3) Attribute-based (class-wise) area-weighted agreement (GLiM-weighted)
// ======================================================

// ======================================================
// 1) INPUT DATA
// ======================================================
// NOTE:
// This script uses prepared Google Earth Engine assets derived from the
// harmonized GLiM and MTA lithological datasets used in the manuscript.
// Users should replace these asset paths with their own prepared inputs
// if direct access is not available.
var TR_GLIM = ee.FeatureCollection("projects/evo880/assets/TR_GLIM_son");
var TR_MTA  = ee.FeatureCollection("projects/evo880/assets/TR_MTA_son");


// ======================================================
// 2) TURKEY AOI (GAUL level0)
// ======================================================
var countries = ee.FeatureCollection('FAO/GAUL/2015/level0');
var turkey = countries.filter(ee.Filter.eq('ADM0_NAME', 'Turkey'));

Map.centerObject(turkey, 6);
Map.addLayer(turkey.geometry(), {}, "Turkey Boundary (GAUL)", false);


// ======================================================
// 3) CLIP TO THE TURKEY BOUNDARY
// (This corrects islands and geometries extending beyond the border)
// ======================================================
var TR_GLIM_clip = TR_GLIM.map(function(f) {
  return f.intersection(turkey.geometry(), ee.ErrorMargin(1));
});

var TR_MTA_clip = TR_MTA.map(function(f) {
  return f.intersection(turkey.geometry(), ee.ErrorMargin(1));
});


// ======================================================
// 4) CLASS → COLOR PALETTE
// (Same palette for both GLIM and MTA)
// ======================================================
var classPalette = ee.Dictionary({
  'Acid Volcanic Rocks (VA)': '#e41a1c',
  'Basic Volcanic Rocks (VB)': '#ff7f00',
  'Intermediate Volcanic Rocks (VI)': '#fb9a99',
  'Pyroclastics (PY)': '#fdbf6f',
  'Plutonic Rocks (PL)': '#984ea3',
  'Metamorphics (MT)': '#4daf4a',
  'Siliciclastic Sedimentary Rocks (SS)': '#377eb8',
  'Carbonate Sedimentary Rocks (SC)': '#a6cee3',
  'Mixed Sedimentary Rocks (SM)': '#b2df8a',
  'Unconsolidated Sediments (SU)': '#ffff99',
  'Evaporites (EV)': '#cab2d6',
  'Complex Lithology (CL)': '#999999',
  'Water Bodies (WB)': '#a6cee3'  // light blue
});
var defaultColor = '#000000';

function styleByClass(fc) {
  return fc.map(function(f) {
    var cls = ee.String(f.get('GLIM_CLASS'));
    var color = ee.String(classPalette.get(cls, defaultColor));
    return f.set('style', {
      color: color,
      width: 0.4,
      fillColor: color
    });
  }).style({styleProperty: 'style'});
}


// ======================================================
// 5) MAP LAYERS
// (Two layers with a shared palette)
// ======================================================
Map.addLayer(styleByClass(TR_GLIM_clip), {}, 'TR_GLIM Lithology (Clipped)', true);
Map.addLayer(styleByClass(TR_MTA_clip),  {}, 'TR_MTA Lithology (Clipped)',  false);


// ======================================================
// 6) SHARED LEGEND
// ======================================================
var legend = ui.Panel({
  style: { position: 'bottom-left', padding: '8px 10px' }
});

legend.add(ui.Label({
  value: 'Lithology Classes (GLIM & MTA)',
  style: { fontWeight: 'bold', fontSize: '14px' }
}));

classPalette.keys().evaluate(function(keys) {
  keys.forEach(function(k) {
    var row = ui.Panel({ layout: ui.Panel.Layout.Flow('horizontal') });

    row.add(ui.Label({
      style: {
        backgroundColor: classPalette.get(k).getInfo(),
        padding: '8px',
        margin: '0 6px 0 0'
      }
    }));

    row.add(ui.Label(k));
    legend.add(row);
  });
});
Map.add(legend);


// ======================================================
// 7) AREA CALCULATION (km²) + PRINT TOTAL AREAS TO CONSOLE
// ======================================================
var addArea_km2 = function(f) {
  return f.set('area_km2', f.geometry().area().divide(1e6));
};

var TR_GLIM_total_area = ee.Number(TR_GLIM_clip.map(addArea_km2).aggregate_sum('area_km2'));
var TR_MTA_total_area  = ee.Number(TR_MTA_clip .map(addArea_km2).aggregate_sum('area_km2'));

print('================================================');
print('📌 TOTAL AREAS (within the Turkey boundary, km²)');
print('GLIM total area (km²):', TR_GLIM_total_area);
print('MTA total area (km²):', TR_MTA_total_area);
print('================================================');


// ======================================================
// 8) CLASS-BASED AREA TABLES (GLIM and MTA)
// ======================================================
function groupSumFC(fc, classProp, areaProp, outClassName) {
  var groups = ee.List(
    fc.reduceColumns({
      selectors: [classProp, areaProp],
      reducer: ee.Reducer.sum().group({
        groupField: 0,
        groupName: outClassName
      })
    }).get('groups')
  );

  return ee.FeatureCollection(groups.map(function(d) {
    d = ee.Dictionary(d);
    return ee.Feature(null, d); // { outClassName: ..., sum: ... }
  }));
}

var GLIM_areaByClass = groupSumFC(TR_GLIM_clip.map(addArea_km2), 'GLIM_CLASS', 'area_km2', 'CLASS');
var MTA_areaByClass  = groupSumFC(TR_MTA_clip .map(addArea_km2), 'GLIM_CLASS', 'area_km2', 'CLASS');

print('📋 GLIM — Total area by class (km²)', GLIM_areaByClass);
print('📋 MTA — Total area by class (km²)', MTA_areaByClass);


// ======================================================
// 9) TWO HISTOGRAMS FOR EACH OF GLIM AND MTA:
// (Area in km²) and (Share in %)
// ======================================================
var GLIM_total_forPct = ee.Number(GLIM_areaByClass.aggregate_sum('sum'));
var MTA_total_forPct  = ee.Number(MTA_areaByClass .aggregate_sum('sum'));

var GLIM_pctByClass = GLIM_areaByClass.map(function(f){
  var a = ee.Number(f.get('sum'));
  var p = ee.Algorithms.If(GLIM_total_forPct.gt(0), a.divide(GLIM_total_forPct).multiply(100), 0);
  return f.set('share_pct', p);
});

var MTA_pctByClass = MTA_areaByClass.map(function(f){
  var a = ee.Number(f.get('sum'));
  var p = ee.Algorithms.If(MTA_total_forPct.gt(0), a.divide(MTA_total_forPct).multiply(100), 0);
  return f.set('share_pct', p);
});

// --- GLIM area histogram
var chart_GlimArea = ui.Chart.feature.byFeature({
  features: GLIM_areaByClass,
  xProperty: 'CLASS',
  yProperties: ['sum']
}).setChartType('ColumnChart').setOptions({
  title: 'GLIM — Area by Class (km²)',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Area (km²)' },
  legend: { position: 'none' }
});
print(chart_GlimArea);

// --- GLIM share (%) histogram
var chart_GlimPct = ui.Chart.feature.byFeature({
  features: GLIM_pctByClass,
  xProperty: 'CLASS',
  yProperties: ['share_pct']
}).setChartType('ColumnChart').setOptions({
  title: 'GLIM — Share by Class (%)',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Share (%)', minValue: 0, maxValue: 100 },
  legend: { position: 'none' }
});
print(chart_GlimPct);

// --- MTA area histogram
var chart_MtaArea = ui.Chart.feature.byFeature({
  features: MTA_areaByClass,
  xProperty: 'CLASS',
  yProperties: ['sum']
}).setChartType('ColumnChart').setOptions({
  title: 'MTA — Area by Class (km²)',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Area (km²)' },
  legend: { position: 'none' }
});
print(chart_MtaArea);

// --- MTA share (%) histogram
var chart_MtaPct = ui.Chart.feature.byFeature({
  features: MTA_pctByClass,
  xProperty: 'CLASS',
  yProperties: ['share_pct']
}).setChartType('ColumnChart').setOptions({
  title: 'MTA — Share by Class (%)',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Share (%)', minValue: 0, maxValue: 100 },
  legend: { position: 'none' }
});
print(chart_MtaPct);


// ======================================================
// 10) (4) SPATIAL AGREEMENT — GLIM × MTA VECTOR INTERSECTION
// (AREA-BASED)
// ======================================================
// Note: This section may be computationally heavy at the country scale
// because it uses join + intersection.
var join = ee.Join.saveAll('matches');

var joined = ee.FeatureCollection(join.apply({
  primary: TR_GLIM_clip,
  secondary: TR_MTA_clip,
  condition: ee.Filter.intersects({leftField: '.geo', rightField: '.geo'})
}));

var intersections = joined.map(function(g) {
  g = ee.Feature(g);
  var gClass = g.get('GLIM_CLASS');
  var matches = ee.List(g.get('matches'));

  var parts = ee.FeatureCollection(matches.map(function(m) {
    m = ee.Feature(m);
    var geom = g.geometry().intersection(m.geometry(), ee.ErrorMargin(1));
    return ee.Feature(geom, {
      'GLIM_CLASS': gClass,
      'MTA_CLASS':  m.get('GLIM_CLASS')
    });
  }));

  return parts;
}).flatten();

var intersectionsA = intersections.map(function(f) {
  return f.set('area_km2', f.geometry().area().divide(1e6));
});

// Total GLIM areas are already available, but class-based values are needed here:
var glimAreaByClass_spatialRef = groupSumFC(TR_GLIM_clip.map(addArea_km2), 'GLIM_CLASS', 'area_km2', 'GLIM_CLASS');

// Correctly matched (diagonal) intersections
var correctIntersections = intersectionsA.filter(
  ee.Filter.equals({leftField: 'GLIM_CLASS', rightField: 'MTA_CLASS'})
);

var correctByGlimClass = groupSumFC(correctIntersections, 'GLIM_CLASS', 'area_km2', 'GLIM_CLASS');

// Class-based spatial agreement table
var classAgreement_spatial = glimAreaByClass_spatialRef.map(function(f) {
  f = ee.Feature(f);
  var cls = ee.String(f.get('GLIM_CLASS'));
  var glimA = ee.Number(f.get('sum'));

  var corrF = correctByGlimClass.filter(ee.Filter.eq('GLIM_CLASS', cls)).first();
  var corrA = ee.Number(ee.Algorithms.If(corrF, corrF.get('sum'), 0));

  var pct = ee.Algorithms.If(glimA.gt(0), corrA.divide(glimA).multiply(100), 0);

  return ee.Feature(null, {
    'CLASS': cls,
    'GLIM_Area_km2': glimA,
    'Correctly_Matched_Area_km2': corrA,
    'Spatial_Agreement_%': pct
  });
}).sort('Spatial_Agreement_%', false);

// Overall spatial agreement (GLIM as reference)
var totalGLIM_spatial = ee.Number(classAgreement_spatial.aggregate_sum('GLIM_Area_km2'));
var totalCorrect_spatial = ee.Number(classAgreement_spatial.aggregate_sum('Correctly_Matched_Area_km2'));

var overallAgreement_spatial = ee.Number(ee.Algorithms.If(
  totalGLIM_spatial.gt(0),
  totalCorrect_spatial.divide(totalGLIM_spatial).multiply(100),
  0
));

print('================================================');
print('✅ (4) SPATIAL (MAP-BASED) AREA-WEIGHTED AGREEMENT (%)');
print('Description: To what extent do GLIM and MTA assign the same class to the same location? (GLIM as reference)');
print('OVERALL SPATIAL AGREEMENT (%):', overallAgreement_spatial);
print('📋 Class-based spatial agreement table', classAgreement_spatial);
print('================================================');


// ======================================================
// 11) (5) CLASS COMPOSITION AGREEMENT
// Similarity of class proportions across the country
// Overall = 100 − 0.5 × Σ|GLIM% − MTA%|
// ======================================================
var allClasses_comp = GLIM_areaByClass.aggregate_array('CLASS')
  .cat(MTA_areaByClass.aggregate_array('CLASS'))
  .distinct();

var compTable = ee.FeatureCollection(allClasses_comp.map(function(cls){
  cls = ee.String(cls);

  var gF = GLIM_pctByClass.filter(ee.Filter.eq('CLASS', cls)).first();
  var mF = MTA_pctByClass .filter(ee.Filter.eq('CLASS', cls)).first();

  var gPct = ee.Number(ee.Algorithms.If(gF, gF.get('share_pct'), 0));
  var mPct = ee.Number(ee.Algorithms.If(mF, mF.get('share_pct'), 0));

  var absDiff = gPct.subtract(mPct).abs();
  var similarity = ee.Number(100).subtract(absDiff); // class-wise similarity (%)

  return ee.Feature(null, {
    'CLASS': cls,
    'GLIM_Share_%': gPct,
    'MTA_Share_%':  mPct,
    'Composition_Similarity_%': similarity,
    'Share_Difference_%': absDiff
  });
}));

var totalAbsDiff = ee.Number(compTable.aggregate_sum('Share_Difference_%'));
var overallCompositionAgreement = ee.Number(100).subtract(totalAbsDiff.divide(2));

print('================================================');
print('✅ (5) CLASS COMPOSITION AGREEMENT (%)');
print('Description: How similar are the class proportions across Turkey? (spatially independent)');
print('Definition: 100 − 0.5 × Σ|GLIM% − MTA%|');
print('OVERALL COMPOSITION AGREEMENT (%):', overallCompositionAgreement);
print('📋 Class-based composition comparison table', compTable);
print('================================================');


// ======================================================
// 12) (6) ATTRIBUTE-BASED (CLASS-WISE) AREA-WEIGHTED AGREEMENT
// (GLIM-weighted)
// Class-wise: 100 × min(A_glim, A_mta) / max(A_glim, A_mta)
// Overall: Σ(GLIM_area × class_agreement) / Σ(GLIM_area)
// ======================================================
var attributeComparison = ee.FeatureCollection(allClasses_comp.map(function(cls){
  cls = ee.String(cls);

  var gF = GLIM_areaByClass.filter(ee.Filter.eq('CLASS', cls)).first();
  var mF = MTA_areaByClass .filter(ee.Filter.eq('CLASS', cls)).first();

  var gA = ee.Number(ee.Algorithms.If(gF, gF.get('sum'), 0));
  var mA = ee.Number(ee.Algorithms.If(mF, mF.get('sum'), 0));

  var maxA = gA.max(mA);
  var minA = gA.min(mA);

  var classAgree = ee.Number(ee.Algorithms.If(
    maxA.gt(0),
    minA.divide(maxA).multiply(100),
    0
  ));

  return ee.Feature(null, {
    'CLASS': cls,
    'GLIM_Area_km2': gA,
    'MTA_Area_km2':  mA,
    'Attribute_Agreement_%': classAgree
  });
}));

var weightedSum_attr = ee.Number(attributeComparison.map(function(f){
  var gA = ee.Number(f.get('GLIM_Area_km2'));
  var ag = ee.Number(f.get('Attribute_Agreement_%'));
  return ee.Feature(null, {w: gA.multiply(ag)});
}).aggregate_sum('w'));

var totalGLIM_attr = ee.Number(attributeComparison.aggregate_sum('GLIM_Area_km2'));

var overallAttributeAgreement_GlimWeighted = ee.Number(ee.Algorithms.If(
  totalGLIM_attr.gt(0),
  weightedSum_attr.divide(totalGLIM_attr),
  0
));

print('================================================');
print('✅ (6) ATTRIBUTE-BASED (CLASS-WISE) AREA-WEIGHTED AGREEMENT (%) — GLIM-weighted');
print('Description: Overall agreement is calculated by considering the area similarity of each class.');
print('Class definition: 100 × min(A_glim, A_mta) / max(A_glim, A_mta)');
print('Overall definition: Σ(GLIM_area × class_agreement) / Σ(GLIM_area)');
print('OVERALL ATTRIBUTE AGREEMENT (%):', overallAttributeAgreement_GlimWeighted);
print('📋 Class-based attribute agreement table', attributeComparison);
print('================================================');


// ======================================================
// 13) (7) PLOT THE CLASS-LEVEL RESULTS OF THE THREE
// VALIDATION METRICS SEPARATELY
// ======================================================

// (7A) Spatial class agreement chart
var chart_spatialClass = ui.Chart.feature.byFeature({
  features: classAgreement_spatial,
  xProperty: 'CLASS',
  yProperties: ['Spatial_Agreement_%']
}).setChartType('ColumnChart').setOptions({
  title: '(7A) Class-Based Spatial Agreement (%) — GLIM as reference',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Spatial Agreement (%)', minValue: 0, maxValue: 100 },
  legend: { position: 'none' }
});
print(chart_spatialClass);

// (7B) Composition (share) similarity chart
var chart_compClass = ui.Chart.feature.byFeature({
  features: compTable,
  xProperty: 'CLASS',
  yProperties: ['Composition_Similarity_%']
}).setChartType('ColumnChart').setOptions({
  title: '(7B) Class-Based Composition Similarity (%) — 100 − |GLIM%−MTA%|',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Similarity (%)', minValue: 0, maxValue: 100 },
  legend: { position: 'none' }
});
print(chart_compClass);

// (7C) Attribute (area) agreement chart
var chart_attrClass = ui.Chart.feature.byFeature({
  features: attributeComparison,
  xProperty: 'CLASS',
  yProperties: ['Attribute_Agreement_%']
}).setChartType('ColumnChart').setOptions({
  title: '(7C) Class-Based Attribute (Area) Agreement (%) — min/max',
  hAxis: { title: 'Lithology Class', slantedText: true, slantedTextAngle: 45 },
  vAxis: { title: 'Agreement (%)', minValue: 0, maxValue: 100 },
  legend: { position: 'none' }
});
print(chart_attrClass);


// ======================================================
// 14) FINAL STEP: PRINT THE SUMMARY OF THE
// THREE METRICS IN ONE PLACE
// ======================================================
print('================================================');
print('🇹🇷 TURKEY — GLIM & MTA LITHOLOGICAL VALIDATION (SUMMARY)');
print('1) Spatial area-weighted agreement (%):', overallAgreement_spatial);
print('   → Overlap of the same class at the same location (GLIM as reference)');
print('2) Composition agreement (%):', overallCompositionAgreement);
print('   → Similarity of class shares across the country (spatially independent)');
print('3) Attribute-based area-weighted agreement (%):', overallAttributeAgreement_GlimWeighted);
print('   → Class-area similarity weighted by GLIM area');
print('================================================');
///////


// note======================================================
// The Earth Engine "memory capacity exceeded" warning
// may appear only during large vector/chart visualization
// and does not affect the numerical results.
// ======================================================
// ======================================================
// SUPPLEMENTARY CHART
// Composition Similarity — Color-Differentiated Display
// Blue : Classes present in both GLIM and MTA
// Red  : Classes absent in GLIM but present only in MTA
// NOTE: This chart does not affect the main analyses.
// ======================================================

// compTable was already generated in the main analysis
// We use it directly here
// Nothing is recalculated

var compForExtraChart = compTable.map(function(f) {
  f = ee.Feature(f);

  var gPct = ee.Number(f.get('GLIM_Share_%') || f.get('GLIM_pct'));
  var mPct = ee.Number(f.get('MTA_Share_%')  || f.get('MTA_pct'));
  var sim  = ee.Number(f.get('Composition_Similarity_%') || f.get('Composition_Similarity'));

  // Absent in GLIM but present in MTA → red
  var onlyMTA = gPct.eq(0).and(mPct.gt(0));

  return f.set({
    'Similarity_GLIM_present': ee.Algorithms.If(onlyMTA, null, sim),
    'Similarity_MTA_only': ee.Algorithms.If(onlyMTA, sim, null)
  });
});

var chart_comp_extra = ui.Chart.feature.byFeature({
  features: compForExtraChart,
  xProperty: 'CLASS',
  yProperties: ['Similarity_GLIM_present', 'Similarity_MTA_only']
})
.setChartType('ColumnChart')
.setOptions({
  title: 'SUPPLEMENTARY FIGURE — Class-Based Composition Similarity (%)\n'
       + 'Blue: GLIM & MTA common | Red: MTA only',
  hAxis: {
    title: 'Lithology Class',
    slantedText: true,
    slantedTextAngle: 45
  },
  vAxis: {
    title: 'Similarity (%)',
    minValue: 0,
    maxValue: 100
  },
  series: {
    0: { color: '#3366cc' }, // blue
    1: { color: '#d62728' }  // red
  },
  legend: { position: 'top' }
});

print(chart_comp_extra);