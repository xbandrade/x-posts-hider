let currentAuthor = null;
const baseXPath = './/article//div[2]/div/div/div[1]/div';
const spanXPath = baseXPath + '/span/span/span';
const textXPath = baseXPath + '/span/text()';
const interactionXPath = './/article/div/div/div[2]/div[2]/div[3]/div/div/div';
const replyInteractionXPath = './/article/div/div/div[2]/div[2]/div[4]/div/div/div';
const replyFocusXPath = './/article/div/div/div[3]/div[5]/div/div/div';
const interactionSpanXPath = '/div/div/div[2]/span/span/span'

const postPattern = /https:\/\/(twitter\.com|x\.com)\/.+\/status\/.*$/;


function removeElementByXPath(xpath) {
    const element = document.evaluate(
        xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    return element && removeParent(element, 12);
}

function removeParent(element, levels) {
    let currentElement = element;
    for (let i = 0; i < levels; i++) {
        if (currentElement.parentElement) {
            currentElement = currentElement.parentElement;
        }
        else {
            return false;
        }
    }
    currentElement.remove();
    return true;
}

function waitUntilDocumentIsReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

function findCommentAuthor(element) {
    if (element) {
        const xpath = './/article//div[2]/div[2]/div[1]//div[1]//div[1]//a'
        const anchorElement = document.evaluate(
            xpath, element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        if (anchorElement) {
            return anchorElement.getAttribute('href');
        }
    }
    return null;
}


function setCurrentPostAuthor(element) {
    currentAuthor = findCommentAuthor(element);
}

function getTextByXPath(xpath, node) {
    const result = document.evaluate(xpath, node, null, XPathResult.STRING_TYPE, null);
    const textContent = result.stringValue.trim();
    return textContent;
}

function findNodeByXPath(xpaths, element) {
    for (var xpath of xpaths) {
        const node = document.evaluate(xpath, element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (node) {
            return node;
        }
    }
    return null;
}

function isInteractionRelevant(node, value) {
    const text = node.textContent.trim();
    if (/[a-zA-Z]/.test(text)) {
        return true;
    }
    return Number.isInteger(Number(text)) && Number(text) >= value;
}

function getInteractionXPaths(index) {
    return [`${interactionXPath}[${index}]${interactionSpanXPath}`,
            `${replyInteractionXPath}[${index}]${interactionSpanXPath}`,
            `${replyFocusXPath}[${index}]${interactionSpanXPath}`]
}

function isCommentRelevant(element, likes = 50, retweets = 50, comments = 30) {
    if (findNodeByXPath(spanXPath, element) || findNodeByXPath(textXPath, element)) {
        return false;
    }

    if (element.querySelector('svg[data-testid="icon-verified"]')) {
        const commentXpaths = getInteractionXPaths(1);
        const retweetXpaths = getInteractionXPaths(2);
        const likeXpaths = getInteractionXPaths(3);
        const commentText = findNodeByXPath(commentXpaths, element);
        const retweetText = findNodeByXPath(retweetXpaths, element);
        const likeText = findNodeByXPath(likeXpaths, element);
        return (
            (commentText && isInteractionRelevant(commentText, comments)) ||
            (retweetText && isInteractionRelevant(retweetText, retweets)) ||
            (likeText && isInteractionRelevant(likeText, likes))
        );
    }
    return true;
}

waitUntilDocumentIsReady(() => {
    try {
        observer = new MutationObserver((mutations) => {
            if (postPattern.test(window.location.href)) {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        mutationsOccurred = true;
                        const ancestors = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
                        setCurrentPostAuthor(ancestors[0]);
                        ancestors.forEach((ancestor) => {
                            if (findCommentAuthor(ancestor) != currentAuthor && !isCommentRelevant(ancestor)) {
                                const child = ancestor.querySelector(':scope > div');
                                if (child) {
                                    child.remove();
                                }
                            }
                        });
                    }
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });        

    } catch (error) {
        console.error('Error: ', error);
    }
});
