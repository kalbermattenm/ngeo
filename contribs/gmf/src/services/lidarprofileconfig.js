goog.provide('gmf.LidarProfileConfig');

goog.require('gmf');


/**
 * TODO
 * @constructor
 * @struct
 * @param {angular.$timeout} $timeout Angular timeout service.
 * @ngInject
 * @ngdoc service
 * @ngname gmfLidarProfileConfig
 */
gmf.LidarProfileConfig = function($http, pytreeLidarProfileJsonUrl) {
  /**
   * @type {angular.$timeout}
   * @private
   */
  this.$http_ = $http;
  
  this.pytreeLidarProfileJsonUrl_ = pytreeLidarProfileJsonUrl;
  
  this.plotParams = {};
  this.plotParams.scaleX = {};
  this.plotParams.currentScaleY = {};
  this.plotParams.currentZoom = 1;
  this.plotParams.previousDomain = [];
  this.plotParams.distanceOffset = 0;

  this.plotParams.initialLOD = 7;
  this.profileConfig = {};
  this.profileConfig = {};
  
  // gmf.LidarProfileConfig.pointAttributes = {};
  this.profileConfig.pointAttributes = {};
};

gmf.LidarProfileConfig.prototype.getClassificationColors = function() {
  this.$http_.get(this.pytreeLidarProfileJsonUrl_ + '/get_classification_colors').then((resp) => {
    this.profileConfig.classification = resp.data;
  });
};

gmf.LidarProfileConfig.prototype.getMaterials = function() {
  // this.$http_.get(this.pytreeLidarProfileJsonUrl_ + '/get_default_material').then((resp) => {
    // this.profileConfig.defautMaterial = resp.data;
  // });
  
  // TODO use pytree service once available
  this.profileConfig.materials = [
    {'name': 'COLOR_PACKED', 'value': 'COLOR_PACKED', 'selected': ''},
    {'name': 'RGB', 'value': 'RGB','selected': 'selected'},
    {'name': 'CLASSIFICATION',  'value': 'CLASSIFICATION','selected': ''}
  ]
};

gmf.LidarProfileConfig.prototype.getSelectedMaterial = function() {
  this.$http_.get(this.pytreeLidarProfileJsonUrl_ + '/get_default_material').then((resp) => {
    this.profileConfig.selectedMaterial = resp.data;
  });
};

gmf.LidarProfileConfig.prototype.getWidth = function() {
  this.profileConfig.profilWidth = 11;
};

gmf.LidarProfileConfig.prototype.getPointAttributes = function() {

  this.profileConfig.pointAttributes.POSITION_CARTESIAN = {
    name: 'POSITION_CARTESIAN',
    elements: 3,
    bytes: 12
  }

  this.profileConfig.pointAttributes.POSITION_PROJECTED_PROFILE = {
    name: 'POSITION_PROJECTED_PROFILE',
    elements: 2,
    bytes: 8
  }

  this.profileConfig.pointAttributes.COLOR_PACKED = {
    name: 'COLOR_PACKED',
    elements: 4,
    bytes: 4
  }

  this.profileConfig.pointAttributes.RGB = {
    name: 'RGB',
    elements: 3,
    bytes: 3
  }

  this.profileConfig.pointAttributes.RGBA = {
    name: 'RGBA',
    elements: 4,
    bytes: 4
  }

  this.profileConfig.pointAttributes.INTENSITY = {
    name: 'INTENSITY',
    elements: 1,
    bytes: 2
  }

  this.profileConfig.pointAttributes.CLASSIFICATION = {
    name: 'CLASSIFICATION',
    elements: 1,
    bytes: 1
  }
};

// gmf.LidarProfileConfig.pointAttributes.POSITION_CARTESIAN = {
  // name: 'POSITION_CARTESIAN',
  // elements: 3,
  // bytes: 12
// }

// gmf.LidarProfileConfig.pointAttributes.POSITION_PROJECTED_PROFILE = {
  // name: 'POSITION_PROJECTED_PROFILE',
  // elements: 2,
  // bytes: 8
// }

// gmf.LidarProfileConfig.pointAttributes.COLOR_PACKED = {
  // name: 'COLOR_PACKED',
  // elements: 4,
  // bytes: 4
// }

// gmf.LidarProfileConfig.pointAttributes.RGB = {
  // name: 'RGB',
  // elements: 3,
  // bytes: 3
// }

// gmf.LidarProfileConfig.pointAttributes.RGBA = {
  // name: 'RGBA',
  // elements: 4,
  // bytes: 4
// }

// gmf.LidarProfileConfig.pointAttributes.INTENSITY = {
  // name: 'INTENSITY',
  // elements: 1,
  // bytes: 2
// }

// gmf.LidarProfileConfig.pointAttributes.CLASSIFICATION = {
  // name: 'CLASSIFICATION',
  // elements: 1,
  // bytes: 1
// }

gmf.module.service('gmfLidarProfileConfig', gmf.LidarProfileConfig);