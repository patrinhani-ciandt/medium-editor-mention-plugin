/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */

// Full polyfill for browsers with no classList support
if (!("classList" in document.createElement("_"))) {
  (function (view) {

    "use strict";

    if (!('Element' in view)) return;

    var
      classListProp = "classList"
      , protoProp = "prototype"
      , elemCtrProto = view.Element[protoProp]
      , objCtr = Object
      , strTrim = String[protoProp].trim || function () {
        return this.replace(/^\s+|\s+$/g, "");
      }
      , arrIndexOf = Array[protoProp].indexOf || function (item) {
        var
          i = 0
          , len = this.length
          ;
        for (; i < len; i++) {
          if (i in this && this[i] === item) {
            return i;
          }
        }
        return -1;
      }
    // Vendors: please allow content code to instantiate DOMExceptions
      , DOMEx = function (type, message) {
        this.name = type;
        this.code = DOMException[type];
        this.message = message;
      }
      , checkTokenAndGetIndex = function (classList, token) {
        if (token === "") {
          throw new DOMEx(
            "SYNTAX_ERR"
            , "An invalid or illegal string was specified"
            );
        }
        if (/\s/.test(token)) {
          throw new DOMEx(
            "INVALID_CHARACTER_ERR"
            , "String contains an invalid character"
            );
        }
        return arrIndexOf.call(classList, token);
      }
      , ClassList = function (elem) {
        var
          trimmedClasses = strTrim.call(elem.getAttribute("class") || "")
          , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
          , i = 0
          , len = classes.length
          ;
        for (; i < len; i++) {
          this.push(classes[i]);
        }
        this._updateClassName = function () {
          elem.setAttribute("class", this.toString());
        };
      }
      , classListProto = ClassList[protoProp] = []
      , classListGetter = function () {
        return new ClassList(this);
      }
      ;
    // Most DOMException implementations don't allow calling DOMException's toString()
    // on non-DOMExceptions. Error's toString() is sufficient here.
    DOMEx[protoProp] = Error[protoProp];
    classListProto.item = function (i) {
      return this[i] || null;
    };
    classListProto.contains = function (token) {
      token += "";
      return checkTokenAndGetIndex(this, token) !== -1;
    };
    classListProto.add = function () {
      var
        tokens = arguments
        , i = 0
        , l = tokens.length
        , token
        , updated = false
        ;
      do {
        token = tokens[i] + "";
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.push(token);
          updated = true;
        }
      }
      while (++i < l);

      if (updated) {
        this._updateClassName();
      }
    };
    classListProto.remove = function () {
      var
        tokens = arguments
        , i = 0
        , l = tokens.length
        , token
        , updated = false
        , index
        ;
      do {
        token = tokens[i] + "";
        index = checkTokenAndGetIndex(this, token);
        while (index !== -1) {
          this.splice(index, 1);
          updated = true;
          index = checkTokenAndGetIndex(this, token);
        }
      }
      while (++i < l);

      if (updated) {
        this._updateClassName();
      }
    };
    classListProto.toggle = function (token, force) {
      token += "";

      var
        result = this.contains(token)
        , method = result ?
          force !== true && "remove"
          :
          force !== false && "add"
        ;

      if (method) {
        this[method](token);
      }

      if (force === true || force === false) {
        return force;
      } else {
        return !result;
      }
    };
    classListProto.toString = function () {
      return this.join(" ");
    };

    if (objCtr.defineProperty) {
      var classListPropDesc = {
        get: classListGetter
        , enumerable: true
        , configurable: true
      };
      try {
        objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
      } catch (ex) { // IE 8 doesn't support enumerable:true
        if (ex.number === -0x7FF5EC54) {
          classListPropDesc.enumerable = false;
          objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
        }
      }
    } else if (objCtr[protoProp].__defineGetter__) {
      elemCtrProto.__defineGetter__(classListProp, classListGetter);
    }

  } (self));
}

/* Blob.js
 * A Blob implementation.
 * 2014-07-24
 *
 * By Eli Grey, http://eligrey.com
 * By Devin Samarin, https://github.com/dsamarin
 * License: X11/MIT
 *   See https://github.com/eligrey/Blob.js/blob/master/LICENSE.md
 */

/*global self, unescape */
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
  plusplus: true */

/*! @source http://purl.eligrey.com/github/Blob.js/blob/master/Blob.js */

(function (view) {
  "use strict";

  view.URL = view.URL || view.webkitURL;

  if (view.Blob && view.URL) {
    try {
      new Blob;
      return;
    } catch (e) { }
  }

  // Internally we use a BlobBuilder implementation to base Blob off of
  // in order to support older browsers that only have BlobBuilder
  var BlobBuilder = view.BlobBuilder || view.WebKitBlobBuilder || view.MozBlobBuilder || (function (view) {
    var
      get_class = function (object) {
        return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
      }
      , FakeBlobBuilder = function BlobBuilder() {
        this.data = [];
      }
      , FakeBlob = function Blob(data, type, encoding) {
        this.data = data;
        this.size = data.length;
        this.type = type;
        this.encoding = encoding;
      }
      , FBB_proto = FakeBlobBuilder.prototype
      , FB_proto = FakeBlob.prototype
      , FileReaderSync = view.FileReaderSync
      , FileException = function (type) {
        this.code = this[this.name = type];
      }
      , file_ex_codes = (
        "NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR "
        + "NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR"
        ).split(" ")
      , file_ex_code = file_ex_codes.length
      , real_URL = view.URL || view.webkitURL || view
      , real_create_object_URL = real_URL.createObjectURL
      , real_revoke_object_URL = real_URL.revokeObjectURL
      , URL = real_URL
      , btoa = view.btoa
      , atob = view.atob

      , ArrayBuffer = view.ArrayBuffer
      , Uint8Array = view.Uint8Array

      , origin = /^[\w-]+:\/*\[?[\w\.:-]+\]?(?::[0-9]+)?/
      ;
    FakeBlob.fake = FB_proto.fake = true;
    while (file_ex_code--) {
      FileException.prototype[file_ex_codes[file_ex_code]] = file_ex_code + 1;
    }
    // Polyfill URL
    if (!real_URL.createObjectURL) {
      URL = view.URL = function (uri) {
        var
          uri_info = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
          , uri_origin
          ;
        uri_info.href = uri;
        if (!("origin" in uri_info)) {
          if (uri_info.protocol.toLowerCase() === "data:") {
            uri_info.origin = null;
          } else {
            uri_origin = uri.match(origin);
            uri_info.origin = uri_origin && uri_origin[1];
          }
        }
        return uri_info;
      };
    }
    URL.createObjectURL = function (blob) {
      var
        type = blob.type
        , data_URI_header
        ;
      if (type === null) {
        type = "application/octet-stream";
      }
      if (blob instanceof FakeBlob) {
        data_URI_header = "data:" + type;
        if (blob.encoding === "base64") {
          return data_URI_header + ";base64," + blob.data;
        } else if (blob.encoding === "URI") {
          return data_URI_header + "," + decodeURIComponent(blob.data);
        } if (btoa) {
          return data_URI_header + ";base64," + btoa(blob.data);
        } else {
          return data_URI_header + "," + encodeURIComponent(blob.data);
        }
      } else if (real_create_object_URL) {
        return real_create_object_URL.call(real_URL, blob);
      }
    };
    URL.revokeObjectURL = function (object_URL) {
      if (object_URL.substring(0, 5) !== "data:" && real_revoke_object_URL) {
        real_revoke_object_URL.call(real_URL, object_URL);
      }
    };
    FBB_proto.append = function (data/*, endings*/) {
      var bb = this.data;
      // decode data to a binary string
      if (Uint8Array && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
        var
          str = ""
          , buf = new Uint8Array(data)
          , i = 0
          , buf_len = buf.length
          ;
        for (; i < buf_len; i++) {
          str += String.fromCharCode(buf[i]);
        }
        bb.push(str);
      } else if (get_class(data) === "Blob" || get_class(data) === "File") {
        if (FileReaderSync) {
          var fr = new FileReaderSync;
          bb.push(fr.readAsBinaryString(data));
        } else {
          // async FileReader won't work as BlobBuilder is sync
          throw new FileException("NOT_READABLE_ERR");
        }
      } else if (data instanceof FakeBlob) {
        if (data.encoding === "base64" && atob) {
          bb.push(atob(data.data));
        } else if (data.encoding === "URI") {
          bb.push(decodeURIComponent(data.data));
        } else if (data.encoding === "raw") {
          bb.push(data.data);
        }
      } else {
        if (typeof data !== "string") {
          data += ""; // convert unsupported types to strings
        }
        // decode UTF-16 to binary string
        bb.push(unescape(encodeURIComponent(data)));
      }
    };
    FBB_proto.getBlob = function (type) {
      if (!arguments.length) {
        type = null;
      }
      return new FakeBlob(this.data.join(""), type, "raw");
    };
    FBB_proto.toString = function () {
      return "[object BlobBuilder]";
    };
    FB_proto.slice = function (start, end, type) {
      var args = arguments.length;
      if (args < 3) {
        type = null;
      }
      return new FakeBlob(
        this.data.slice(start, args > 1 ? end : this.data.length)
        , type
        , this.encoding
        );
    };
    FB_proto.toString = function () {
      return "[object Blob]";
    };
    FB_proto.close = function () {
      this.size = 0;
      delete this.data;
    };
    return FakeBlobBuilder;
  } (view));

  view.Blob = function (blobParts, options) {
    var type = options ? (options.type || "") : "";
    var builder = new BlobBuilder();
    if (blobParts) {
      for (var i = 0, len = blobParts.length; i < len; i++) {
        if (Uint8Array && blobParts[i] instanceof Uint8Array) {
          builder.append(blobParts[i].buffer);
        }
        else {
          builder.append(blobParts[i]);
        }
      }
    }
    var blob = builder.getBlob(type);
    if (!blob.slice && blob.webkitSlice) {
      blob.slice = blob.webkitSlice;
    }
    return blob;
  };

  var getPrototypeOf = Object.getPrototypeOf || function (object) {
    return object.__proto__;
  };
  view.Blob.prototype = getPrototypeOf(new view.Blob());
} (typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content || this));

(function (root, factory) {
    'use strict';
    if (typeof module === 'object') {
        module.exports = factory;
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return factory;
        });
    } else {
        root.MediumEditorMention = factory;
    }
}(this, function () {

    'use strict';

/*jshint unused: true */
function last(text) {
  return text[text.length - 1];
}

var LEFT_ARROW_KEYCODE = 37;

function unwrapForTextNode(el, doc) {
  var parentNode = el.parentNode;
  MediumEditor.util.unwrap(el, doc);

  // Merge textNode
  var currentNode = parentNode.lastChild,
      prevNode = currentNode.previousSibling;

  while (prevNode) {
    if (currentNode.nodeType === 3 && prevNode.nodeType === 3) {
      prevNode.textContent += currentNode.textContent;
      parentNode.removeChild(currentNode);
    }
    currentNode = prevNode;
    prevNode = currentNode.previousSibling;
  }
}

return MediumEditor.Extension.extend({
  name: 'editor-mention',

  /* @deprecated: use extraPanelClassName. Will remove in next major (3.0.0) release
  * extraClassName: [string]
  *
  * Extra className to be added with the 'medium-editor-mention-panel' element.
  */
  extraClassName: '',

  /* @deprecated: use extraActivePanelClassName. Will remove in next major (3.0.0) release
  * extraActiveClassName: [string]
  *
  * Extra active className to be added with the 'medium-editor-mention-panel-active' element.
  */
  extraActiveClassName: '',

  /* extraPanelClassName: [string]
  *
  * Extra className to be added with the 'medium-editor-mention-panel' element.
  */
  extraPanelClassName: '',

  /* extraActivePanelClassName: [string]
  *
  * Extra active className to be added with the 'medium-editor-mention-panel-active' element.
  */
  extraActivePanelClassName: '',

  extraTriggerClassNameMap: {},

  extraActiveTriggerClassNameMap: {},

  /* tagName: [string]
  *
  * Element tag name that would indicate that this mention. It will have
  * 'medium-editor-mention-at' className applied on it.
  */
  tagName: 'strong',

  /* renderPanelContent: [
  *    function (panelEl: dom, currentMentionText: string, selectMentionCallback: function)
  * ]
  *
  * Render function that used to create the content of the panel when panel is show.
  *
  * @params panelEl: DOM element of the panel.
  *
  * @params currentMentionText: Often used as query criteria. e.g. @medium
  *
  * @params selectMentionCallback:
  *    callback used in customized panel content.
  *
  *    When called with null, it tells the Mention plugin to close the panel.
  *        e.g. selectMentionCallback(null);
  *
  *    When called with text, it tells the Mention plugin that the text is selected by the user.
  *        e.g. selectMentionCallback('@mediumrocks')
  */
  renderPanelContent: function () { },

  /* destroyPanelContent: [function (panelEl: dom)]
  *
  * Destroy function to remove any contents rendered by renderPanelContent
  *  before panelEl being removed from the document.
  *
  * @params panelEl: DOM element of the panel.
  */
  destroyPanelContent: function () { },

  activeTriggerList: ['@'],

  triggerClassNameMap: {
    '#': 'medium-editor-mention-hash',
    '@': 'medium-editor-mention-at'
  },

  activeTriggerClassNameMap: {
    '#': 'medium-editor-mention-hash-active',
    '@': 'medium-editor-mention-at-active'
  },

  hideOnBlurDelay: 300,

  init: function () {
    this.initMentionPanel();
    this.attachEventHandlers();
  },

  destroy: function () {
    if (this.mentionPanel) {
      if (this.mentionPanel.parentNode) {
        this.destroyPanelContent(this.mentionPanel);
        this.mentionPanel.parentNode.removeChild(this.mentionPanel);
      }
      delete this.mentionPanel;
    }
  },

  initMentionPanel: function () {
    var el = this.document.createElement('div');

    el.classList.add('medium-editor-mention-panel');
    if (this.extraPanelClassName || this.extraClassName) {
      el.classList.add(this.extraPanelClassName || this.extraClassName);
    }

    this.getEditorOption('elementsContainer').appendChild(el);

    this.mentionPanel = el;
  },

  attachEventHandlers: function () {
    if (this.hideOnBlurDelay !== null && this.hideOnBlurDelay !== undefined) {
      // for hideOnBlurDelay, the panel should hide after blur event
      this.subscribe('blur', this.handleBlur.bind(this));
      // and clear out hide timeout if focus again
      this.subscribe('focus', this.handleFocus.bind(this));
    }
    // if the editor changes its content, we have to show or hide the panel
    this.subscribe('editableKeyup', this.handleKeyup.bind(this));
  },

  handleBlur: function () {
    if (this.hideOnBlurDelay !== null && this.hideOnBlurDelay !== undefined) {
      var that = this;
      this.hideOnBlurDelayId = setTimeout(function () {
        that.hidePanel(false);
      }, this.hideOnBlurDelay);
    }
  },

  handleFocus: function () {
    if (this.hideOnBlurDelayId) {
      clearTimeout(this.hideOnBlurDelayId);
      this.hideOnBlurDelayId = null;
    }
  },

  handleKeyup: function (event) {
    var keyCode = MediumEditor.util.getKeyCode(event),
        isSpace = keyCode === MediumEditor.util.keyCode.SPACE;

    this.getWordFromSelection(event.target, isSpace ? -1 : 0);

    if (!isSpace && this.activeTriggerList.indexOf(this.trigger) !== -1 && this.word.length > 1) {
      this.showPanel();
    } else {
      this.hidePanel(keyCode === LEFT_ARROW_KEYCODE);
    }
  },

  hidePanel: function (isArrowTowardsLeft) {
    this.mentionPanel.classList.remove('medium-editor-mention-panel-active');
    var extraActivePanelClassName = this.extraActivePanelClassName || this.extraActiveClassName;

    if (extraActivePanelClassName) {
      this.mentionPanel.classList.remove(extraActivePanelClassName);
    }
    if (this.activeMentionAt) {
      this.activeMentionAt.classList.remove(this.activeTriggerClassName);
      if (this.extraActiveTriggerClassName) {
        this.activeMentionAt.classList.remove(this.extraActiveTriggerClassName);
      }
    }
    if (this.activeMentionAt) {
      // http://stackoverflow.com/a/27004526/1458162
      var activeMentionAt = this.activeMentionAt,
          siblingNode = isArrowTowardsLeft ? activeMentionAt.previousSibling : activeMentionAt.nextSibling,
          textNode;

      if (!siblingNode) {
        textNode = this.document.createTextNode('');
        activeMentionAt.parentNode.appendChild(textNode);
      } else if (siblingNode.nodeType !== 3) {
        textNode = this.document.createTextNode('');
        activeMentionAt.parentNode.insertBefore(textNode, siblingNode);
      } else {
        textNode = siblingNode;
      }

      var lastEmptyWord = last(activeMentionAt.firstChild.textContent),
          hasLastEmptyWord = lastEmptyWord.trim().length === 0;

      if (hasLastEmptyWord) {
        var mentionAtFirstChild = activeMentionAt.firstChild;
        activeMentionAt.firstChild.textContent = mentionAtFirstChild.textContent.substr(0, mentionAtFirstChild.textContent.length - 1);
        textNode.textContent = '' + lastEmptyWord + '' + textNode.textContent;
      } else {
        if (textNode.textContent.length === 0 && activeMentionAt.firstChild.textContent.length > 1) {
          textNode.textContent = '\u00A0';
        }
      }
      if (isArrowTowardsLeft) {
        MediumEditor.selection.select(this.document, textNode, textNode.length);
      } else {
        MediumEditor.selection.select(this.document, textNode, Math.min(textNode.length, 1));
      }
      if (activeMentionAt.firstChild.textContent.length <= 1) {
        // LIKE core#execAction
        this.base.saveSelection();
        unwrapForTextNode(this.activeMentionAt, this.document);
        this.base.restoreSelection();
      }
      //
      this.activeMentionAt = null;
    }
  },

  getWordFromSelection: function (target, initialDiff) {
    var selectRange = MediumEditor.selection.getSelectionRange(this.document);
    if (selectRange.startContainer !== selectRange.endContainer) {
      return;
    }
    var startContainer = selectRange.startContainer;

    function getWordPosition(position, diff) {
      var prevText = startContainer.textContent[position - 1];
      if (prevText === null || prevText === undefined) {
        return position;
      } else if (prevText.trim().length === 0 || position <= 0 || startContainer.textContent.length < position) {
        return position;
      } else {
        return getWordPosition(position + diff, diff);
      }
    }

    this.wordStart = getWordPosition(selectRange.startOffset + initialDiff, -1);
    this.wordEnd = getWordPosition(selectRange.startOffset + initialDiff, 1) - 1;
    this.word = startContainer.textContent.slice(this.wordStart, this.wordEnd);
    this.trigger = this.word.slice(0, 1);
    this.triggerClassName = this.triggerClassNameMap[this.trigger];
    this.activeTriggerClassName = this.activeTriggerClassNameMap[this.trigger];
    //
    this.extraTriggerClassName = this.extraTriggerClassNameMap[this.trigger];
    this.extraActiveTriggerClassName = this.extraActiveTriggerClassNameMap[this.trigger];
  },

  showPanel: function () {
    if (!this.mentionPanel.classList.contains('medium-editor-mention-panel-active')) {
      this.activatePanel();
      this.wrapWordInMentionAt();
    }
    this.positionPanel();
    this.updatePanelContent();
  },

  activatePanel: function () {
    this.mentionPanel.classList.add('medium-editor-mention-panel-active');
    if (this.extraActivePanelClassName || this.extraActiveClassName) {
      this.mentionPanel.classList.add(this.extraActivePanelClassName || this.extraActiveClassName);
    }
  },

  wrapWordInMentionAt: function () {
    var selection = this.document.getSelection();
    if (!selection.rangeCount) {
      return;
    }
    // http://stackoverflow.com/a/6328906/1458162
    var range = selection.getRangeAt(0).cloneRange();
    if (range.startContainer.parentNode.classList.contains(this.triggerClassName)) {
      this.activeMentionAt = range.startContainer.parentNode;
    } else {
      var nextWordEnd = Math.min(this.wordEnd, range.startContainer.textContent.length);
      range.setStart(range.startContainer, this.wordStart);
      range.setEnd(range.startContainer, nextWordEnd);
      // Instead, insert our own version of it.
      // TODO: Not sure why, but using <span> tag doens't work here
      var element = this.document.createElement(this.tagName);
      element.classList.add(this.triggerClassName);
      if (this.extraTriggerClassName) {
        element.classList.add(this.extraTriggerClassName);
      }
      this.activeMentionAt = element;
      //
      range.surroundContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      //
      MediumEditor.selection.select(
        this.document,
        this.activeMentionAt.firstChild,
        this.word.length
        );
    }
    this.activeMentionAt.classList.add(this.activeTriggerClassName);
    if (this.extraActiveTriggerClassName) {
      this.activeMentionAt.classList.add(this.extraActiveTriggerClassName);
    }
  },

  positionPanel: function () {
    var activeMentionAtClientRect = this.activeMentionAt.getBoundingClientRect(),
        panelContainer = this.window;

    this.mentionPanel.style.top = (panelContainer.pageYOffset + activeMentionAtClientRect.bottom) + 'px';
    this.mentionPanel.style.left = (panelContainer.pageXOffset + activeMentionAtClientRect.left + activeMentionAtClientRect.width) + 'px';
  },

  updatePanelContent: function () {
    this.renderPanelContent(this.mentionPanel, this.word, this.handleSelectMention.bind(this));
  },

  handleSelectMention: function (seletedText) {
    if (seletedText) {
      var textNode = this.activeMentionAt.firstChild;
      textNode.textContent = seletedText;
      MediumEditor.selection.select(this.document, textNode, seletedText.length);
      //
      this.hidePanel(false);
    } else {
      this.hidePanel(false);
    }
  }
});
MediumEditorMention.parseVersionString = function (release) {
  var split = release.split('-'),
    version = split[0].split('.'),
    preRelease = (split.length > 1) ? split[1] : '';
  return {
    major: parseInt(version[0], 10),
    minor: parseInt(version[1], 10),
    revision: parseInt(version[2], 10),
    preRelease: preRelease,
    toString: function () {
      return [version[0], version[1], version[2]].join('.') + (preRelease ? '-' + preRelease : '');
    }
  };
};

MediumEditorMention.version = MediumEditorMention.parseVersionString.call(this, ({
  // grunt-bump looks for this:
  'version': '0.10.0'
}).version);

    
}()));
