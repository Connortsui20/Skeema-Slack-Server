/**
 * Given 2 strings, finds a string that is lexicographically in the middle.
 * If given an empty string for "next", will find a higher-order string
 *
 * The function is always guranteed to find a string in between 2 other valid
 * strings.
 * It is also always guranteed to find a string after the first string if the
 * second string is empty. In other words, it can always find the next string.
 * However, it will NEVER find a string that is lexicographically less
 * than the first string. It is the caller's responsibility to ensure that they
 * don't need to insert at the beginning unless they are willing to reassign
 * previous orders.
 *
 * ? https://stackoverflow.com/a/38927158/16400535
 *
 * @param {string} prev
 * @param {string} next
 * @returns {string}
 */
function midString(prev, next) {
    let p, n, pos, str;
    // find leftmost non-matching character
    for (pos = 0; p == n; pos++) {
        p = pos < prev.length ? prev.charCodeAt(pos) : 96;
        n = pos < next.length ? next.charCodeAt(pos) : 123;
    }
    str = prev.slice(0, pos - 1); // copy identical part of string
    // prev string equals beginning of next
    if (p == 96) {
        // next character is 'a'
        while (n == 97) {
            n = pos < next.length ? next.charCodeAt(pos++) : 123; // get char from next
            str += "a"; // insert an 'a' to match the 'a'
        }
        // next character is 'b'
        if (n == 98) {
            str += "a"; // insert an 'a' to match the 'b'
            n = 123; // set to end of alphabet
        }
    } else if (p + 1 == n) {
        // found consecutive characters
        str += String.fromCharCode(p); // insert character from prev
        n = 123; // set to end of alphabet
        // p='z'
        while ((p = pos < prev.length ? prev.charCodeAt(pos++) : 96) == 122) {
            str += "z"; // insert 'z' to match 'z'
        }
    }
    return str + String.fromCharCode(Math.ceil((p + n) / 2)); // append middle character
}

/**
 * Comparison function for 2 strings according to midString ordering.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} 1 if a > b, -1 if b < a
 * @throw Error if a == b, this should not be possible
 */
function compareMidString(a, b) {
    if (a > b) {
        return 1;
    } else if (b > a) {
        return -1;
    } else {
        throw new Error("Equal strings found");
    }
}

/**
 * Comparison function for 2 objects with order string fields
 * according to midString ordering.
 *
 * @param {string} obj1
 * @param {string} obj2
 * @returns {number} 1 if obj1.order > obj2.order, -1 if obj2.order < obj1.order
 * @throw Error if "order" field not present in either object
 * @throw Error if a == b, this should not be possible
 */
function compareObjectsMidString(obj1, obj2) {
    if (!("order" in obj1 && "order" in obj2)) {
        throw new Error("One of the objects does not have an order field");
    }
    if (obj1.order > obj2.order) {
        return 1;
    } else if (obj2.order > obj1.order) {
        return -1;
    } else {
        throw new Error("Equal strings found");
    }
}

/**
 * Comparison function for 2 objects with order and priority string fields
 * according to midString ordering.
 *
 * @param {string} obj1
 * @param {string} obj2
 * @returns {number} ordering by priority field then order field
 * @throw Error if "order" field not present in either object
 */
function compareObjectsMidStringWithPriority(obj1, obj2) {
    if (!("urgency" in obj1 && "urgency" in obj2)) {
        throw new Error("One of the objects does not have an urgency field");
    }
    if (obj1.urgency > obj2.urgency) {
        return -1;
    } else if (obj1.urgency == obj2.urgency) {
        try {
            return compareObjectsMidString(obj1, obj2);
        } catch (err) {
            throw err;
        }
    } else {
        return 1;
    }
}

/**
 * Helper function for appendFront. See appendFront for more details.
 *
 * @param {[string]} orders a list of strings that we will push into
 * @returns {[string]} a list of strings
 */
function pushFront(orders) {
    n = orders.length;
    if (n == 0) {
        return [midString("", "")];
    } else if (n == 1) {
        return [orders[0], midString(orders[0], "")];
    }
    mid = midString(orders[0], orders[1]);
    return [orders[0], mid].concat(orders.slice(1));
}

/**
 * Pushes a m strings to the front of a midString-ordered string list.
 * Inserts a midString at the second position.
 *
 * It is the caller's responsibility'to reassign the new first string to the
 * new element that needs to be ordered, as well as changing the old first
 * element into the new second element.
 *
 * @param {[string]} orders a list of strings that we will push into
 * @returns {[string]} a list of strings
 */
function appendFront(m, orders) {
    if (m == 0) {
        return;
    } else if (m == 1) {
        return pushFront(orders);
    }
    return appendFront(m - 1, pushFront(orders));
}

/**
 * Helper function for appendBack. See appendBack for more details.
 * ! Probably not correct, testing required
 *
 * @param {[string]} orders a list of strings that we will push into
 * @returns {[string]} a list of strings
 */
function pushBack(orders) {
    n = orders.length;
    if (n == 0) {
        return [midString("", "")];
    }
    next = midString(orders[n - 1], "");
    return [...orders, next];
}

/**
 * Pushes m strings to the back of a midString-ordered string list
 *
 * @param {[string]} strings a list of strings that we will push onto
 * @returns {[string]} a list of strings
 */
function appendBack(m, orders) {
    if (m == 1) {
        return pushBack(orders);
    }
    return appendBack(m - 1, pushBack(orders));
}

module.exports = {
    midString,
    compareMidString,
    compareObjectsMidString,
    compareObjectsMidStringWithPriority,
    pushFront,
    pushBack,
    appendFront,
    appendBack,
};
