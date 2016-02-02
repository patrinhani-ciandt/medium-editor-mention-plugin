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