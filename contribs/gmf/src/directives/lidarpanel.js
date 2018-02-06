goog.provide('gmf.lidarPanelComponent');

goog.require('gmf');
goog.require('gmf.lidarProfile.Config');
goog.require('gmf.lidarProfile.Manager');
goog.require('ol.geom.LineString');


gmf.module.value('gmfLidarPanelTemplateUrl',
  /**
     * @param {!angular.JQLite} $element Element.
     * @param {!angular.Attributes} $attrs Attributes.
     * @return {string} Template.
     */
  ($element, $attrs) => {
    const templateUrl = $attrs['gmfLidarPanelTemplateUrl'];
    return templateUrl !== undefined ? templateUrl :
      `${gmf.baseTemplateUrl}/lidarpanel.html`;
  });


/**
 * @param {!angular.JQLite} $element Element.
 * @param {!angular.Attributes} $attrs Attributes.
 * @param {!function(!angular.JQLite, !angular.Attributes): string} gmfLidarPanelTemplateUrl Template function.
 * @return {string} Template URL.
 * @ngInject
 */
function gmfLidarPanelTemplateUrl($element, $attrs, gmfLidarPanelTemplateUrl) {
  return gmfLidarPanelTemplateUrl($element, $attrs);
}


/**
 * Provide a component that display a lidar profile panel.
 * @ngdoc component
 * @ngname gmfLidarPanel
 */
gmf.lidarPanelComponent = {
  controller: 'gmfLidarPanelController',
  bindings: {
    'active': '=gmfLidarPanelActive',
    'map': '=gmfLidarPanelMap',
    'line': '=gmfLidarPanelLine'
  },
  templateUrl: gmfLidarPanelTemplateUrl
};


gmf.module.component('gmfLidarPanel', gmf.lidarPanelComponent);


/**
 * @param {angular.Scope} $scope Angular scope.
 * @param {gmf.lidarProfile.Manager} gmfLidarProfileManager gmf gmfLidarProfileManager.
 * @param {gmf.lidarProfile.Config} gmfLidarProfileConfig gmf gmfLidarProfileConfig.
 * @param {ngeo.ToolActivateMgr} ngeoToolActivateMgr Ngeo ToolActivate manager service
 * @param {ngeo.ToolActivate} ngeoToolActivate Ngeo ToolActivate service.
 * @constructor
 * @private
 * @ngInject
 * @ngdoc controller
 * @ngname gmfLidarPanelController
 */
gmf.LidarPanelController = function($scope, gmfLidarProfileManager, gmfLidarProfileConfig,
  ngeoToolActivateMgr, ngeoToolActivate) {

  /**
   * @type {gmf.lidarProfile.Config}
   */
  this.gmfLidarProfileConfig = gmfLidarProfileConfig;

  /**
   * @type {gmf.lidarProfile.Manager}
   */
  this.profile = gmfLidarProfileManager;
  this.profile.init(this.gmfLidarProfileConfig);

  /**
   * @type {boolean}
   */
  this.active;

  /**
  * The Openlayers LineString geometry of the profle
  * @type {ol.geom.LineString}
  * @export
  */
  this.line;

  /**
  * The width of the profile
  * @type {number}
  * @export
  */
  this.profilWidth;

  /**
  * Get the width of the profile from Pytree config
  * @type {boolean}
  * @export
  */
  this.autoWidth = true;

  /**
  * State of the measure tool
  * @type {boolean}
  * @export
  */
  this.measureActive = false;

  /**
   * selected options
   * @type {lidarProfileServer.ConfigPointAttributes|undefined}
   * @export
   */
  this.selectOption;

  // Watch the line to update the profileData (data for the chart).
  $scope.$watch(
    () => this.line,
    (newLine, oldLine) => {
      if (oldLine !== newLine) {
        this.update_();
      }
    });

  /**
   * @type {ngeo.ToolActivateMgr}
   * @private
   */
  this.ngeoToolActivateMgr_ = ngeoToolActivateMgr;

  // Initialize the tools inside of the tool manager
  this.tool = new ngeo.ToolActivate(this, 'active');
  this.ngeoToolActivateMgr_.registerTool('mapTools', this.tool, false);

  $scope.$watch(
    () => this.active,
    (newValue, oldValue) => {
      if (oldValue !== newValue) {
        this.updateEventsListening_(newValue);
      }
    });

};


/**
 * @private
 */
gmf.LidarPanelController.prototype.$onInit = function() {
  this.active = this.active;
  this.gmfLidarProfileConfig.initProfileConfig().then((resp) => {
    this.ready = true;
    this.profile.loader.setMap(this.map);
    this.selectedOption = this.gmfLidarProfileConfig.profileConfig.pointAttributes.selectedOption;
  });
};

/**
 * @param {boolean} activate Activation state of the plugin
 * @private
 */
gmf.LidarPanelController.prototype.updateEventsListening_ = function(activate) {
  if (activate === true) {
    this.ngeoToolActivateMgr_.activateTool(this.tool);
  } else {
    this.ngeoToolActivateMgr_.deactivateTool(this.tool);
  }
};

/**
 * Activate the measure tool
 * @export
 */
gmf.LidarPanelController.prototype.setMeasureActive = function() {
  this.measureActive = true;
  this.profile.measure.clearMeasure();
  this.profile.measure.setMeasureActive();
};

/**
 * Clear the current measure
 * @export
 */
gmf.LidarPanelController.prototype.clearMeasure = function() {
  this.measureActive = false;
  this.profile.measure.clearMeasure();
};

/**
 * Reload and reset the plot for the current profile (reloads data)
 * @export
 */
gmf.LidarPanelController.prototype.resetPlot = function() {
  this.profile.loader.clearBuffer();
  this.profile.loader.getProfileByLOD(0, true, 0);
};


/**
 * Get the available classifications for this dataset
 * @export
 * @return {Object} classification list
 */
gmf.LidarPanelController.prototype.getClassification = function() {
  return this.gmfLidarProfileConfig.profileConfig.server.classification_colors;
};

/**
 * Get the avalaible point attributes for this dataset
 * @export
 * @return {Array.<lidarProfileServer.ConfigPointAttributes>|undefined} this.pointAttributes
 */
gmf.LidarPanelController.prototype.getPointAttributes = function() {
  return this.gmfLidarProfileConfig.profileConfig.client.pointAttributes.availableOptions;
};

/**
 * Get the selected point attribute
 * @export
 * @return {lidarProfileServer.ConfigPointAttributes|undefined} this.pointAttributes
 */
gmf.LidarPanelController.prototype.getSelectedAttribute = function() {
  return this.gmfLidarProfileConfig.profileConfig.client.pointAttributes.selectedOption;
};

/**
 * Set the profile points color for the selected attribute (material)
 * @export
 * @param {string} material string code
 */
gmf.LidarPanelController.prototype.setDefaultAttribute = function(material) {
  this.gmfLidarProfileConfig.profileConfig.server.default_attribute = material;
  if (this.line) {
    this.profile.plot.changeStyle(material);
  }
};

/**
 * Get the width of the profile
 * @export
 * @return {number} width of the profile
 */
gmf.LidarPanelController.prototype.getWidth = function() {
  this.profilWidth = this.gmfLidarProfileConfig.profileConfig.server.width;
  return this.profilWidth;
};

/**
 * Sets the visible classification in the profile
 * @export
 * @param {lidarProfileServer.ConfigClassification} classification selected value
 * @param {number} key of the classification code
 */
gmf.LidarPanelController.prototype.setClassification = function(classification, key) {
  this.gmfLidarProfileConfig.profileConfig.server.classification_colors[key].visible = classification.visible;
  if (this.line) {
    this.profile.plot.setClassActive(this.gmfLidarProfileConfig.profileConfig.server.classification_colors,
      this.gmfLidarProfileConfig.profileConfig.server.default_attribute);
  }
};

/**
 * Sets the profil width and request new profile from Pytree
 * Sets the width of the profile and get a new profile from Pytree
 * @export
 * @param {number} profileWidth set the width using user inputs and reload the profile
 */
gmf.LidarPanelController.prototype.setWidth = function(profileWidth) {
  this.gmfLidarProfileConfig.profileConfig.server.width = profileWidth;
  if (this.line) {
    this.profile.loader.clearBuffer();
    this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
  }
};

/**
 * Use profile width defined per span and LOD in Pytree config
 * @export
 * @param {boolean} autoWidth use a precalculated profile width from pytree
 */
gmf.LidarPanelController.prototype.setAutoWidth = function(autoWidth) {
  this.gmfLidarProfileConfig.profileConfig.client.autoWidth = autoWidth;
  if (this.line) {
    this.profile.loader.clearBuffer();
    this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
  }
};

/**
 * Export the profile data to CSV file
 * @export
 */
gmf.LidarPanelController.prototype.csvExport = function() {
  if (this.line) {
    this.profile.loader.utils.getPointsInProfileAsCSV(this.profile.loader.profilePoints);
  }
};

/**
 * Export the current d3 chart to PNG file
 * @export
 */
gmf.LidarPanelController.prototype.pngExport = function() {
  if (this.line) {
    this.profile.loader.utils.exportToImageFile();
  }
};

/**
 * @private
 */
gmf.LidarPanelController.prototype.update_ = function() {
  if (this.line) {
    this.profile.loader.setLine(this.line);
    this.profile.loader.clearBuffer();
    this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
  } else {
    this.profile.loader.clearBuffer();
    this.profile.loader.cartoHighlight.setPosition(undefined);
  }
};


gmf.module.controller('gmfLidarPanelController', gmf.LidarPanelController);
