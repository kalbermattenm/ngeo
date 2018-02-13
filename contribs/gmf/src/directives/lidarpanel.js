goog.provide('gmf.lidarPanelComponent');

goog.require('gmf');
goog.require('gmf.lidarProfile.Config');
goog.require('gmf.lidarProfile.Manager');
goog.require('ngeo.CsvDownload');
goog.require('ngeo.Download');
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
    'map': '<gmfLidarPanelMap',
    'line': '=gmfLidarPanelLine'
  },
  templateUrl: gmfLidarPanelTemplateUrl
};


gmf.module.component('gmfLidarPanel', gmf.lidarPanelComponent);


gmf.LidarPanelController = class {

  /**
   * @param {angular.Scope} $scope Angular scope.
   * @param {gmf.lidarProfile.Manager} gmfLidarProfileManager gmf gmfLidarProfileManager.
   * @param {gmf.lidarProfile.Config} gmfLidarProfileConfig gmf gmfLidarProfileConfig.
   * @param {ngeo.ToolActivateMgr} ngeoToolActivateMgr Ngeo ToolActivate manager service
   * @param {ngeo.ToolActivate} ngeoToolActivate Ngeo ToolActivate service.
   * @param {ngeo.CsvDownload} ngeoCsvDownload The csv download function.
   * @constructor
   * @private
   * @ngInject
   * @ngdoc controller
   * @ngname gmfLidarPanelController
   */
  constructor($scope, gmfLidarProfileManager, gmfLidarProfileConfig, ngeoToolActivateMgr,
    ngeoToolActivate, ngeoCsvDownload) {

    /**
     * @type {boolean}
     */
    this.ready = false;

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
    this.active = false;

    /**
     * The Openlayers LineString geometry of the profle
     * @type {ol.geom.LineString}
     * @export
     */
    this.line;

    /**
     * State of the measure tool
     * @type {boolean}
     * @export
     */
    this.measureActive = false;

    /**
     * @type {ngeo.Download}
     * @private
     */
    this.ngeoCsvDownload_ = ngeoCsvDownload;

    /**
     * @type {ngeo.ToolActivateMgr}
     * @private
     */
    this.ngeoToolActivateMgr_ = ngeoToolActivateMgr;

    // Initialize the tools inside of the tool manager
    this.tool = new ngeo.ToolActivate(this, 'active');
    this.ngeoToolActivateMgr_.registerTool('mapTools', this.tool, false);

    // Activate the controls inside the panel.
    $scope.$watch(
      () => this.active,
      (newValue, oldValue) => {
        if (oldValue !== newValue) {
          this.updateEventsListening_(newValue);
        }
      });

    // Watch the line to update the profileData (data for the chart).
    $scope.$watch(
      () => this.line,
      (newLine, oldLine) => {
        if (oldLine !== newLine) {
          this.update_();
        }
      });
  }


  /**
   * @private
   */
  $onInit() {
    this.profile.loader.setMap(this.map);
  }


  /**
   * @private
   */
  initConfigAndActivateTool_() {
    this.gmfLidarProfileConfig.initProfileConfig().then((resp) => {
      this.ready = true;
      this.ngeoToolActivateMgr_.activateTool(this.tool);
    });
  }


  /**
   * @param {boolean} activate Activation state of the plugin
   * @private
   */
  updateEventsListening_(activate) {
    if (activate === true) {
      if (!this.ready) {
        this.initConfigAndActivateTool_();
      } else {
        this.ngeoToolActivateMgr_.activateTool(this.tool);
      }
    } else {
      this.ngeoToolActivateMgr_.deactivateTool(this.tool);
    }
  }


  /**
   * @private
   */
  update_() {
    this.profile.loader.clearBuffer();
    if (this.line) {
      this.profile.loader.setLine(this.line);
      this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
    } else {
      this.profile.loader.cartoHighlight.setPosition(undefined);
    }
  }


  /**
   * Activate the measure tool
   * @export
   */
  setMeasureActive() {
    this.measureActive = true;
    this.profile.measure.clearMeasure();
    this.profile.measure.setMeasureActive();
  }


  /**
   * Clear the current measure
   * @export
   */
  clearMeasure() {
    this.measureActive = false;
    this.profile.measure.clearMeasure();
  }


  /**
   * Reload and reset the plot for the current profile (reloads data)
   * @export
   */
  resetPlot() {
    this.profile.loader.clearBuffer();
    this.profile.loader.getProfileByLOD(0, true, 0);
  }


  /**
   * Get all available point attributes.
   * @return {Array.<lidarProfileServer.ConfigPointAttributes>|undefined} available point attributes.
   * @export
   */
  getAvailablePointAttributes() {
    return this.gmfLidarProfileConfig.profileConfig.client.pointAttributes.availableOptions;
  }


  /**
   * Get / Set the selected point attribute
   * @param {lidarProfileServer.ConfigPointAttributes=} opt_selectedOption the new selected point attribute.
   * @return {lidarProfileServer.ConfigPointAttributes|undefined} Selected point attribute
   * @export
   */
  getSetSelectedPointAttribute(opt_selectedOption) {
    if (opt_selectedOption !== undefined) {
      this.gmfLidarProfileConfig.profileConfig.client.pointAttributes.selectedOption = opt_selectedOption;
      this.profile.plot.changeStyle(opt_selectedOption.value);
    }
    return this.gmfLidarProfileConfig.profileConfig.client.pointAttributes.selectedOption;
  }


  /**
   * Get the available classifications for this dataset
   * @export
   * @return {lidarProfileServer.ConfigClassifications} classification list
   */
  getClassification() {
    return this.gmfLidarProfileConfig.profileConfig.server.classification_colors;
  }


  /**
   * Sets the visible classification in the profile
   * @export
   * @param {lidarProfileServer.ConfigClassification} classification selected value
   * @param {number} key of the classification code
   */
  setClassification(classification, key) {
    this.gmfLidarProfileConfig.profileConfig.server.classification_colors[key].visible = classification.visible;
    if (this.line) {
      this.profile.plot.setClassActive(this.gmfLidarProfileConfig.profileConfig.server.classification_colors,
        this.gmfLidarProfileConfig.profileConfig.server.default_attribute);
    }
  }


  /**
   * Get the profile width or set the profil width and request new profile from Pytree.
   * @param {number=} opt_profileWidth the new profile width.
   * @return {number} width of the profile
   * @export
   */
  getSetWidth(opt_profileWidth) {
    if (opt_profileWidth !== undefined) {
      this.gmfLidarProfileConfig.profileConfig.server.width = opt_profileWidth;
      if (this.line) {
        this.profile.loader.clearBuffer();
        this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
      }
    }
    return this.gmfLidarProfileConfig.profileConfig.server.width;
  }


  /**
   * Use profile width defined per span and LOD in Pytree config
   * @param {boolean=} opt_autoWidth use a precalculated profile width from pytree if true.
   * @return {boolean} The autoWidth state
   * @export
   */
  getSetAutoWidth(opt_autoWidth) {
    if (opt_autoWidth !== undefined) {
      this.gmfLidarProfileConfig.profileConfig.client.autoWidth = opt_autoWidth;
      if (this.line) {
        this.profile.loader.clearBuffer();
        this.profile.loader.getProfileByLOD(0, true, this.gmfLidarProfileConfig.profileConfig.server.minLOD);
      }
    }
    return this.gmfLidarProfileConfig.profileConfig.client.autoWidth;
  }


  /**
   * Export the profile data to CSV file
   * @export
   */
  csvExport() {
    if (this.line) {
      const points = this.profile.loader.utils.getFlatPointsByDistance(this.profile.loader.profilePoints);
      const csvData = this.profile.loader.utils.getCSVData(points);
      let headerColumns = Object.keys(points[0]);
      headerColumns = headerColumns.map((column) => {
        return {'name': column};
      });
      this.ngeoCsvDownload_.startDownload(csvData, headerColumns, 'LIDAR_profile.csv');
    }
  }


  /**
   * Export the current d3 chart to PNG file
   * @export
   */
  pngExport() {
    if (this.line) {
      this.profile.loader.utils.downloadProfileAsImageFile(this.gmfLidarProfileConfig.profileConfig.client);
    }
  }
};

gmf.module.controller('gmfLidarPanelController', gmf.LidarPanelController);
