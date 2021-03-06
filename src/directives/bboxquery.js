goog.provide('ngeo.bboxQueryDirective');

goog.require('ngeo');
goog.require('ngeo.Query');
goog.require('ol.interaction.DragBox');


/**
 * Provides a "bbox query" directive.
 *
 * This directive is responsible of binding a map and the ngeo query service
 * together. While active, drawing a bbox while CTRL or the 'meta' key is pressed
 * issues a request to the query service.
 *
 * This directive doesn't require to be rendered in a visible DOM element, but
 * it could be used with a ngeo-btn to manage the activation of the directive.
 * See below an example without any use of UI:
 *
 * Example:
 *
 *      <span
 *        ngeo-bbox-query=""
 *        ngeo-bbox-query-map="::ctrl.map"
 *        ngeo-bbox-query-active="ctrl.queryActive">
 *        ngeo-bbox-query-autoclear="ctrl.queryAutoClear">
 *      </span>
 *
 * See the live example: [../examples/bboxquery.html](../examples/bboxquery.html)
 *
 * @param {ngeo.Query} ngeoQuery The ngeo Query service.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoBboxQuery
 */
ngeo.bboxQueryDirective = function(ngeoQuery) {
  return {
    restrict: 'A',
    scope: false,
    link: function(scope, elem, attrs) {
      /**
       * @type {ol.Map}
       */
      var map = scope.$eval(attrs['ngeoBboxQueryMap']);

      var interaction = new ol.interaction.DragBox({
        condition: ol.events.condition.platformModifierKeyOnly
      });

      /**
       * Called when a bbox is drawn while this controller is active. Issue
       * a request to the query service using the extent that was drawn.
       * @param {ol.interaction.DragBox.Event} evt Event.
       */
      var handleBoxEnd = function(evt) {
        var extent = interaction.getGeometry().getExtent();
        ngeoQuery.issue(map, extent);
      };
      interaction.on('boxend', handleBoxEnd);

      // watch 'active' property -> activate/deactivate accordingly
      scope.$watch(attrs['ngeoBboxQueryActive'],
          function(newVal, oldVal) {
            if (newVal) {
              // activate
              map.addInteraction(interaction);
            } else {
              // deactivate
              map.removeInteraction(interaction);
              if (scope.$eval(attrs['ngeoBboxQueryAutoclear']) !== false) {
                ngeoQuery.clear();
              }
            }
          }
      );
    }
  };
};

ngeo.module.directive('ngeoBboxQuery', ngeo.bboxQueryDirective);
