goog.provide('gmf.lidarProfile.Loader');

goog.require('gmf.lidarProfile.Utils');


gmf.lidarProfile.Loader = class {

  /**
   * FIXME missing description
   * @struct
   * @param {gmf.lidarProfile.Manager} gmfLidarProfileManagerInstance gmf lidar profile manager instance
   */
  constructor(gmfLidarProfileManagerInstance) {

    /**
     * @type {gmf.lidarProfile.Manager}
     * @private
     */
    this.manager_ = gmfLidarProfileManagerInstance;

    /**
     * The hovered point attributes in d3 profile highlighted on the 2D map
     * @type {ol.Overlay}
     */
    this.cartoHighlight = new ol.Overlay({
      offset: [0, -15],
      positioning: 'bottom-center'
    });

    /**
     * The hovered point geometry (point) in d3 profile highlighted on the 2D map
     * @type {ol.layer.Vector}
     */
    this.lidarPointHighlight = new ol.layer.Vector({
      source: new ol.source.Vector({}),
      style: new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 1)'
          }),
          radius: 3
        })
      })
    });

    /**
     * The profile footpring represented as a LineString represented
     * with real mapunites stroke width
     * @type {ol.layer.Vector}
     */
    this.lidarBuffer = new ol.layer.Vector({
      source: new ol.source.Vector({})
    });


    /**
     * The variable where all points of the profile are stored
     * @type {gmfx.LidarProfilePoints}
     */
    this.profilePoints = this.getEmptyProfilePoints_();

    /**
     * @type {boolean}
     * @private
     */
    this.isPlotSetup_ = false;

    /**
     * @type {ol.geom.LineString}
     * @private
     */
    this.line_;

    /**
     * @type {gmf.lidarProfile.Utils}
     */
    this.utils = new gmf.lidarProfile.Utils(this.manager_.options);
  }


  /**
   * Clears the profile footprint
   * @export
   */
  clearBuffer() {
    if (this.lidarBuffer) {
      this.lidarBuffer.getSource().clear();
    }
  }


  /**
   * Set the line for the profile
   * @param {ol.geom.LineString} line that defines the profile
   * @export
   */
  setLine(line) {
    this.line_ = line;
  }

  /**
   * Set the map for the ol.layer.Vector layers
   * @param {ol.Map} map of the desktop app
   * @export
   */
  setMap(map) {
    this.cartoHighlight.setMap(map);
    this.lidarPointHighlight.setMap(map);
    this.lidarBuffer.setMap(map);
    this.utils.setMap(map);
  }

  /**
   * @return {gmfx.LidarProfilePoints} An empty lidarProfile points object.
   * @private
   */
  getEmptyProfilePoints_() {
    return {
      distance: [],
      altitude: [],
      color_packed: [],
      intensity: [],
      classification: [],
      coords: []
    };
  }


  /**
   * Load profile data (lidar points) by succesive Levels Of Details using asynchronous requests
   * @param {number} distanceOffset the left side of d3 profile domain at current zoom and pan configuration
   * @param {boolean} resetPlot wether to reset d3 plot or not
   * @param {number} minLOD minimum level of detail
   * @export
   */
  getProfileByLOD(distanceOffset, resetPlot, minLOD) {
    this.profilePoints = this.getEmptyProfilePoints_();

    if (resetPlot) {
      this.isPlotSetup_ = false;
    }

    d3.select('#lidarError').style('visibility', 'hidden');
    let pytreeLinestring = this.utils.getPytreeLinestring(this.line_);

    let maxLODWith;
    if (distanceOffset == 0) {
      maxLODWith = this.utils.getNiceLOD(this.line_.getLength());
    } else {
      const domain = this.manager_.plot.scaleX['domain']();
      const clip = this.utils.clipLineByMeasure(this.line_, domain[0], domain[1]);
      pytreeLinestring = '';
      for (let i = 0; i < clip.clippedLine.length; i++) {
        pytreeLinestring += `{${clip.clippedLine[i][0]},${clip.clippedLine[i][1]}},`;
      }
      pytreeLinestring = pytreeLinestring.substr(0, pytreeLinestring.length - 1);
      maxLODWith = this.utils.getNiceLOD(domain[1] - domain[0]);

    }

    let lastLOD = false;
    d3.select('#lodInfo').html('');
    this.manager_.options.profileConfig.client.pointSum = 0;
    let profileWidth = 0;
    if (this.manager_.options.profileConfig.client.autoWidth) {
      profileWidth = maxLODWith.width;
    } else {
      profileWidth = this.manager_.options.profileConfig.server.width;
    }

    d3.select('#widthInfo').html(`Profile width: ${profileWidth}m`);

    for (let i = 0; i < maxLODWith.maxLOD; i++) {
      if (i == 0) {
        this.queryPytree_(minLOD, this.manager_.options.profileConfig.server.initialLOD, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, resetPlot);
        i += this.manager_.options.profileConfig.server.initialLOD - 1;
      } else if (i < maxLODWith.maxLOD - 1) {
        this.queryPytree_(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, false);
      } else {
        lastLOD = true;
        this.queryPytree_(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, false);
      }
    }
  }


  /**
   * Request to Pytree service for a range of Level Of Detail (LOD)
   * @param {number} minLOD minimum level of detail of the request
   * @param {number} maxLOD maximum level of detail of the request
   * @param {number} iter the iteration in profile requests cycle
   * @param {string} coordinates linestring in cPotree format
   * @param {number} distanceOffset the left side of d3 profile domain at current zoom and pan configuration
   * @param {boolean} lastLOD the deepest level to retrieve for this profile
   * @param {number} width the width of the profile
   * @param {boolean} resetPlot wether to reset d3 plot or not, used for first LOD
   * @private
   */
  queryPytree_(minLOD, maxLOD, iter, coordinates, distanceOffset, lastLOD, width, resetPlot) {
    if (this.manager_.options.profileConfig.server.debug) {
      let html = d3.select('#lodInfo').html();
      html += `Loading LOD: ${minLOD}-${maxLOD}...<br>`;
      d3.select('#lodInfo').html(html);
    }

    const pointCloudName = this.manager_.options.profileConfig.server.default_point_cloud;
    const hurl = `${this.manager_.options.pytreeLidarProfileJsonUrl}/get_profile?minLOD=${minLOD}
      &maxLOD=${maxLOD}&width=${width}&coordinates=${coordinates}&pointCloud=${pointCloudName}&attributes='`;

    this.manager_.$http.get(hurl, {
      headers: {
        'Content-Type': 'text/plain; charset=x-user-defined'
      },
      responseType: 'arraybuffer'
    }).then((response) => {
      if (this.manager_.options.profileConfig.server.debug) {
        let html = d3.select('#lodInfo').html();
        html += `LOD: ${minLOD}-${maxLOD} loaded <br>`;
        d3.select('#lodInfo').html(html);
      }
      this.processBuffer_(response.data, iter, distanceOffset, lastLOD, resetPlot);
    }, (response) => {
      console.error(response);
    });
  }


  /**
   * Process the binary array return by Pytree (cPotree)
   * @param {ArrayBuffer} profile binary array returned by cPotree executable called by Pytree
   * @param {number} iter the iteration in profile requests cycle
   * @param {number} distanceOffset the left side of d3 profile domain at current zoom and pan configuration
   * @param {boolean} lastLOD the deepest level to retrieve for this profile
   * @param {boolean} resetPlot wether to reset d3 plot or not
   * @private
   */
  processBuffer_(profile, iter, distanceOffset, lastLOD, resetPlot) {
    const typedArrayInt32 = new Int32Array(profile, 0, 4);
    const headerSize = typedArrayInt32[0];

    const uInt8header = new Uint8Array(profile, 4, headerSize);
    let strHeaderLocal = '';
    for (let i = 0; i < uInt8header.length; i++) {
      strHeaderLocal += String.fromCharCode(uInt8header[i]);
    }

    try {

      JSON.parse(strHeaderLocal);

    } catch (e) {
      if (!this.isPlotSetup_) {
        const canvasEl = d3.select('#profileCanvas').node();
        const ctx = d3.select('#profileCanvas')
          .node().getContext('2d');
        ctx.clearRect(0, 0, canvasEl.getBoundingClientRect().width, canvasEl.getBoundingClientRect().height);
        d3.select('svg#profileSVG').selectAll('*').remove();
        let errorTxt = '<p><b>Lidar profile service error</b></p>';
        errorTxt += '<p>It might be offline</p>';
        // TODO: check extent consistency earlier
        errorTxt += '<p>Or did you attempt to draw a profile outside data extent ?</p>';
        errorTxt += '<p>Or did you attempt to draw such a small profile that no point was returned ?</p>';
        d3.select('#lidarError').style('visibility', 'visible');
        d3.select('#lidarError').html(errorTxt);
      }
      return;
    }

    d3.select('#lidarError').style('visibility', 'hidden');

    const jHeader = JSON.parse(strHeaderLocal);

    // If number of points return is higher than Pytree configuration max value,
    // stop sending requests.
    this.manager_.options.profileConfig.client.pointSum += jHeader['points'];
    if (this.manager_.options.profileConfig.client.pointSum >
        this.manager_.options.profileConfig.server.max_point_number) {
      console.warn('Number of points is higher than Pytree configuration max value !');
    }

    const attr = jHeader['pointAttributes'];
    const attributes = [];
    for (let j = 0; j < attr.length; j++) {
      if (this.manager_.options.profileConfig.server.point_attributes[attr[j]] != undefined) {
        attributes.push(this.manager_.options.profileConfig.server.point_attributes[attr[j]]);
      }
    }
    const scale = jHeader['scale'];

    if (jHeader['points'] < 3) {
      this.isPlotSetup_ = false;
      return;
    }

    const points = this.getEmptyProfilePoints_();
    const bytesPerPoint = jHeader['bytesPerPoint'];
    const buffer = profile.slice(4 + headerSize);
    for (let i = 0; i < jHeader['points']; i++) {

      const byteOffset = bytesPerPoint * i;
      const view = new DataView(buffer, byteOffset, bytesPerPoint);
      let aoffset = 0;
      for (let k = 0; k < attributes.length; k++) {

        if (attributes[k]['value'] == 'POSITION_PROJECTED_PROFILE') {

          const udist = view.getUint32(aoffset, true);
          const ualti = view.getUint32(aoffset + 4, true);
          const dist = udist * scale;
          const alti = ualti * scale;
          points.distance.push(Math.round(100 * (distanceOffset + dist)) / 100);
          this.profilePoints.distance.push(Math.round(100 * (distanceOffset + dist)) / 100);
          points.altitude.push(Math.round(100 * alti) / 100);
          this.profilePoints.altitude.push(Math.round(100 * alti) / 100);

        } else if (attributes[k]['value']  == 'CLASSIFICATION') {
          const classif = view.getUint8(aoffset);
          points.classification.push(classif);
          this.profilePoints.classification.push(classif);

        } else if (attributes[k]['value']  == 'INTENSITY') {
          const intensity = view.getUint8(aoffset);
          points.intensity.push(intensity);
          this.profilePoints.intensity.push(intensity);

        } else if (attributes[k]['value'] == 'COLOR_PACKED') {
          const r = view.getUint8(aoffset);
          const g = view.getUint8(aoffset + 1);
          const b = view.getUint8(aoffset + 2);
          points.color_packed.push([r, g, b]);
          this.profilePoints.color_packed.push([r, g, b]);

        } else if (attributes[k]['value']  == 'POSITION_CARTESIAN') {
          const x = view.getInt32(aoffset, true) * scale + jHeader['boundingBox']['lx'];
          const y = view.getInt32(aoffset + 4, true) * scale + jHeader['boundingBox']['ly'];
          points.coords.push([x, y]);
          this.profilePoints.coords.push([x, y]);
        }
        aoffset = aoffset + attributes[k]['bytes'];
      }
    }

    const rangeX = [0, this.line_.getLength()];

    // TODO fix z offset issue in Pytree!

    const rangeY = [this.utils.arrayMin(points.altitude), this.utils.arrayMax(points.altitude)];

    if (iter == 0 && resetPlot) {
      this.manager_.plot.setupPlot(rangeX, rangeY);
      this.isPlotSetup_ = true;
      this.manager_.plot.drawPoints(points, this.manager_.options.profileConfig.server.default_attribute);

    } else if (!this.isPlotSetup_) {
      this.manager_.plot.setupPlot(rangeX, rangeY);
      this.isPlotSetup_ = true;
      this.manager_.plot.drawPoints(points, this.manager_.options.profileConfig.server.default_attribute);
    } else {
      this.manager_.plot.drawPoints(points, this.manager_.options.profileConfig.server.default_attribute);
    }
  }

  /**
   * Update the profile data according to d3 chart zoom and pan level
   * The update will wait on a 200ms pause on the actions of users before to do the update.
   * @export
   */
  updateData() {
    this.manager_.ngeoDebounce(this.updateData_.bind(this), 200, true)();
  }

  /**
   * @private
   */
  updateData_() {
    const domainX = this.manager_.plot.scaleX['domain']();
    const domainY = this.manager_.plot.scaleY['domain']();
    const clip = this.utils.clipLineByMeasure(this.line_, domainX[0], domainX[1]);

    this.lidarBuffer.getSource().clear();
    this.lidarBuffer.getSource().addFeature(clip.bufferGeom);
    this.lidarBuffer.setStyle(clip.bufferStyle);

    const span = domainX[1] - domainX[0];
    const maxLODWidth = this.utils.getNiceLOD(span);
    const xTolerance = 0.2;

    if (Math.abs(domainX[0] - this.manager_.plot.previousDomainX[0]) < xTolerance &&
        Math.abs(domainX[1] - this.manager_.plot.previousDomainX[1]) < xTolerance) {

      this.manager_.plot.drawPoints(this.profilePoints,
        this.manager_.options.profileConfig.server.default_attribute);

    } else {
      if (maxLODWidth.maxLOD <= this.manager_.options.profileConfig.server.initialLOD) {
        this.manager_.plot.drawPoints(this.profilePoints,
          this.manager_.options.profileConfig.server.default_attribute);
      } else {
        this.getProfileByLOD(clip.distanceOffset, false, 0);

      }
    }

    this.manager_.plot.previousDomainX = domainX;
    this.manager_.plot.previousDomainY = domainY;
  }
};
