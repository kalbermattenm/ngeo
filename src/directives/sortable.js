goog.provide('ngeo.SortableOptions');
goog.provide('ngeo.sortableDirective');

goog.require('goog.dom');
goog.require('goog.fx.DragListDirection');
goog.require('goog.fx.DragListGroup');
goog.require('ngeo');


/**
 * @typedef {{
 *     handleClassName: (string|undefined),
 *     draggerClassName: (string|undefined)
 * }}
 */
ngeo.SortableOptions;


/**
 * Provides a directive that allows drag-and-dropping DOM items between them.
 * It also changes the order of elements in the given array.
 *
 * It is typically used together with `ng-repeat`, for example for re-ordering
 * layers in a map.
 *
 * Example:
 *
 *     <ul ngeo-sortable="ctrl.layers"
 *         ngeo-sortable-options="{handleClassName: 'ngeo-sortable-handle'}">
 *       <li ng-repeat="layer in ctrl.layers">
 *         <span class="ngeo-sortable-handle">handle</span>{{layer.get('name')}}
 *       </li>
 *     </ul>
 *
 * The value of the "ngeo-sortable" attribute is an expression which evaluates
 * to an array (an array of layers in the above example). This is the array
 * that is re-ordered after a drag-and-drop.
 *
 * The element with the class "ngeo-sortable-handle" is the "drag handle".
 * It is required.
 *
 * This directives uses `$watchCollection` to watch the "sortable" array. So
 * if some outside code adds/removes elements to/from the "sortable" array,
 * the "ngeoSortable" directive will pick it up.
 *
 * See our live example: [../examples/layerorder.html](../examples/layerorder.html)
 *
 * @htmlAttribute {Array.<ol.layer.Base>} ngeo-sortable The layers to sort.
 * @htmlAttribute {!ngeo.SortableOptions} ngeo-sortable-options The options.
 * @htmlAttribute {Function(angular.JQLite, Array)?} ngeo-sortable-callback
 *     Callback function called after the move end. The Function will be called
 *     with the element and the sort array as arguments.
 * @htmlAttribute {Object?} ngeo-sortable-callback-ctx Context to apply at
 *     the call of the callback function.
 * @param {angular.$timeout} $timeout Angular timeout service.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoSortable
 */
ngeo.sortableDirective = function($timeout) {
  return {
    restrict: 'A',
    link:
        /**
         * @param {angular.Scope} scope Scope.
         * @param {angular.JQLite} element Element.
         * @param {angular.Attributes} attrs Attributes.
         */
        function(scope, element, attrs) {

          var sortable = /** @type {Array} */
              (scope.$eval(attrs['ngeoSortable'])) || [];
          goog.asserts.assert(Array.isArray(sortable));

          var optionsObject = scope.$eval(attrs['ngeoSortableOptions']);
          var options = getOptions(optionsObject);

          var callbackFn = scope.$eval(attrs['ngeoSortableCallback']);
          var callbackCtx = scope.$eval(attrs['ngeoSortableCallbackCtx']);

          /**
           * @type {goog.fx.DragListGroup}
           */
          var dragListGroup = null;

          scope.$watchCollection(function() {
            return sortable;
          }, function() {
            sortable.length && $timeout(resetUpDragDrop, 0);
          });

          /**
           * This function resets drag&drop for the list. It is called each
           * time the sortable array changes (see $watchCollection above).
           */
          function resetUpDragDrop() {
            // Save the current nodes in order to restore the state if the node
            // is dropped at the same place
            // In this case the comments and element nodes are messed up
            var savedNodes = element.contents();

            var children = element.children();
            for (var i = 0; i < children.length; ++i) {
              angular.element(children[i]).data('idx', i);
            }

            if (dragListGroup !== null) {
              dragListGroup.dispose();
            }

            dragListGroup = new goog.fx.DragListGroup();
            dragListGroup.addDragList(element[0],
                goog.fx.DragListDirection.DOWN);
            dragListGroup.setFunctionToGetHandleForDragItem(
                /**
                 * @param {Element} dragItem Drag item.
                 * @return {Element} The handle.
                 */
                function(dragItem) {
                  var className = options['handleClassName'];
                  return goog.dom.getElementByClass(className, dragItem);
                });

            if (options['draggerClassName'] !== undefined) {
              dragListGroup.setDraggerElClass(options['draggerClassName']);
            }

            if (options['currDragItemClassName'] !== undefined) {
              dragListGroup.setCurrDragItemClass(options['currDragItemClassName']);
            }

            /** @type {number} */
            var hoverNextItemIdx = -1;

            /** @type {Element} */
            var hoverList = null;

            goog.events.listen(dragListGroup, 'dragstart', function(e) {
              hoverNextItemIdx = -1;
              hoverList = null;
              /**
               * Adding dynamically the width of the draggerEl to fit the currDragItem width.
               * - > the draggerEl is clipped to the body with an absolute position.
               */
              angular.element(e.draggerEl).css('width', e.currDragItem.offsetWidth);
            });

            goog.events.listen(dragListGroup, 'dragmove', function(e) {
              var next = e.hoverNextItem;
              hoverNextItemIdx = next === null ? -1 :
                  /** @type {number} */ (angular.element(next).data('idx'));
              hoverList = e.hoverList;
            });

            goog.events.listen(dragListGroup, 'dragend', function(e) {
              var li = e.currDragItem;
              var idx = /** @type {number} */
                  (angular.element(li).data('idx'));
              if (hoverList === null ||
                  hoverNextItemIdx == idx + 1 ||
                  (hoverNextItemIdx == -1 &&
                   idx == element.children().length - 1)) {
                // element dropped out of the list container
                // or
                // element dropped at the same location
                // -> restore initial nodes list
                element.append(savedNodes);
              } else if (hoverNextItemIdx != -1) {
                // there's a next item, so insert
                if (hoverNextItemIdx != idx) {
                  if (hoverNextItemIdx > idx) {
                    hoverNextItemIdx--;
                  }
                  scope.$apply(function() {
                    sortable.splice(hoverNextItemIdx, 0,
                        sortable.splice(idx, 1)[0]);
                  });
                }
              } else {
                // there's no next item, so push
                scope.$apply(function() {
                  sortable.push(sortable.splice(idx, 1)[0]);
                });
              }
              // Call the callback function if it exists.
              if (callbackFn instanceof Function) {
                callbackFn.apply(callbackCtx, [element, sortable]);
              }
            });

            dragListGroup.init();
          }

          /**
           * @param {?} options Options after expression evaluation.
           * @return {!ngeo.SortableOptions} Options object.
           * @private
           */
          function getOptions(options) {
            var ret;
            var defaultHandleClassName = 'ngeo-sortable-handle';
            if (options === undefined) {
              ret = {'handleClassName': defaultHandleClassName};
            } else {
              if (options['handleClassName'] === undefined) {
                options['handleClassName'] = defaultHandleClassName;
              }
              ret = /** @type {ngeo.SortableOptions} */ (options);
            }
            return ret;
          }

        }
  };
};

ngeo.module.directive('ngeoSortable', ngeo.sortableDirective);
