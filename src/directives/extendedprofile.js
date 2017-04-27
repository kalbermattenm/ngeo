goog.provide('ngeo.extendedextendedProfileDirective');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('ngeo');
goog.require('ngeo.extendedProfile');
goog.require('ngeo.Debounce');


/**
 * Provides a directive used to insert an elevation extendedProfile chart
 * in the DOM.
 *
 * Example:
 *
 *      <div ngeo-extendedProfile="ctrl.extendedProfileData"
 *        ngeo-extendedProfile-options="ctrl.extendedProfileOptions"
 *        ngeo-extendedProfile-pois="ctrl.extendedProfilePois">
 *      </div>
 *
 * Where "ctrl.extendedProfileOptions" is of type {@link ngeox.extendedProfile.extendedProfileOptions};
 * "ctrl.extendedProfileData" and "ctrl.extendedProfilePois" are arrays which will be
 * processed by {@link ngeox.extendedProfile.ElevationExtractor} and
 * {@link ngeox.extendedProfile.PoiExtractor}.
 *
 * See our live example: [../examples/extendedProfile.html](../examples/extendedProfile.html)
 *
 * @htmlAttribute {?Object} ngeo-extendedProfile The extendedProfile data.
 * @htmlAttribute {ngeox.extendedProfile.extendedProfileOptions} ngeo-extendedProfile-options The options.
 * @htmlAttribute {?Array} ngeo-extendedProfile-pois The data for POIs.
 * @htmlAttribute {*} ngeo-extendedProfile-highlight Any property on the scope which
 * evaluated value may correspond to distance from origin.
 * @param {ngeo.Debounce} ngeoDebounce ngeo Debounce service.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoextendedProfile
 */
ngeo.extendedextendedProfileDirective = function(ngeoDebounce) {
  return {
    restrict: 'A',
    /**
     * @param {angular.Scope} scope Scope.
     * @param {angular.JQLite} element Element.
     * @param {angular.Attributes} attrs Atttributes.
     */
    link(scope, element, attrs) {

      const optionsAttr = attrs['ngeoextendedProfileOptions'];
      goog.asserts.assert(optionsAttr !== undefined);

      const selection = d3.select(element[0]);
      let extendedProfile, elevationData, poiData;

      scope.$watchCollection(optionsAttr, (newVal) => {

        const options = /** @type {ngeox.extendedProfile.extendedProfileOptions} */
                (ol.obj.assign({}, newVal));

        if (options !== undefined) {

          // proxy the hoverCallback and outCallbackin order to be able to
          // call $applyAsync
          //
          // We're using $applyAsync here because the callback may be
          // called inside the Angular context. For example, it's the case
          // when the user hover's the line geometry on the map and the
          // extendedProfileHighlight property is changed.
          //
          // For that reason we use $applyAsync instead of $apply here.
          if (options.hoverCallback !== undefined) {
            const origHoverCallback = options.hoverCallback;
            options.hoverCallback = function(...args) {
              origHoverCallback(...args);
              scope.$applyAsync();
            };
          }

          if (options.outCallback !== undefined) {
            const origOutCallback = options.outCallback;
            options.outCallback = function() {
              origOutCallback();
              scope.$applyAsync();
            };
          }

          extendedProfile = ngeo.extendedProfile(options);
          refreshData();
        }
      });

      scope.$watch(attrs['ngeoextendedProfile'], (newVal, oldVal) => {
        elevationData = newVal;
        refreshData();
      });

      scope.$watch(attrs['ngeoextendedProfilePois'], (newVal, oldVal) => {
        poiData = newVal;
        refreshData();
      });

      scope.$watch(attrs['ngeoextendedProfileHighlight'],
              (newVal, oldVal) => {
                if (newVal === undefined) {
                  return;
                }
                if (newVal > 0) {
                  extendedProfile.highlight(newVal);
                } else {
                  extendedProfile.clearHighlight();
                }
              });

      goog.events.listen(window, goog.events.EventType.RESIZE,
              ngeoDebounce(refreshData, 50, true),
              false, this);

      function refreshData() {
        if (extendedProfile !== undefined) {
          selection.datum(elevationData).call(extendedProfile);
          if (elevationData !== undefined) {
            extendedProfile.showPois(poiData);
          }
        }
      }
    }
  };
};

ngeo.module.directive('ngeoextendedProfile', ngeo.extendedextendedProfileDirective);
