Object.compare = function (obj1, obj2) {
  if (!obj1 && !obj2) return true;
  if (!obj1 && obj2) return false;
  if (obj1 && !obj2) return false;

  for (var p in obj1) {
    if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;

    switch (typeof (obj1[p])) {
      case 'object':
        if (!Object.compare(obj1[p], obj2[p])) return false;
        break;
      case 'function':
        if (typeof (obj2[p]) == 'undefined' || (p != 'compare' && obj1[p].toString() != obj2[p].toString())) return false;
        break;
      default:
        if (obj1[p] != obj2[p]) return false;
    }
  }
  for (var p in obj2) {
    if (typeof (obj1[p]) == 'undefined') return false;
  }
  return true;
};

var NUM_INTERVAL = 672;

var calendar = null;

export function getCalendar(db, uid, cb) {
  db.ref('users/' + uid + '/calendar').on('value', function(snapshot) {
    var arr = new Array(672).fill(null);
    if (! snapshot.val()) {
      cb(arr);
      return;
    }
    for (var i=0; i<arr.length; i++) {
      if (i in snapshot.val()) {
        arr[i] = snapshot.val()[i];
      }
    }
    cb(arr);
  });
}

export function generateCalendar(lst) {
  lst = mergesort(lst);

  console.log(lst);

  var cal = [];

  for (var i=0; i<NUM_INTERVAL; i++) {
    cal.push(null);
  }

  for (var i=0; i<lst.length; i++) {
    var a = largestSubarrayIndex(cal);
    var max = a[0], ind = a[1];
    if (lst[i]['start']) {
      ind = lst[i]['start'];
      if(canBePlaced(cal, lst[i]['duration']), ind, 0) {
        place(cal, lst[i]['duration'], ind, lst[i], 0);
        continue;
      } else {
        place(cal, lst[i]['duration'], a[1], lst[i], 0);
        continue;
      }
    }
    if (lst[i]['duration'] <= max) {
      place(cal, lst[i]['duration'], ind, lst[i], 0);
    } else if (max == 0) {
      break;
    }
  }
  return cal;
}

export function generateSmartCalendar(db, uid, lst) {
  if (!lst || lst.length == 0) return;
  lst = mergesort(lst);
  var calc = new Array(672).fill(null);

  var avgSpace = numSpaces(NUM_INTERVAL, totalDuration(generateCalendar(lst)));


  var obj = {};
  for (var i=0; i<NUM_INTERVAL; i++) {
    obj[i] = null;
  }

  console.log(lst);

  var counter = 0;
  while (lst[counter] &&  lst[counter]['start']) {
    for (var i = 0; i<lst[counter]['duration']+avgSpace; i++) {
      delete obj[lst[counter]['start']+i];
    }
    place(calc, lst[counter]['duration'], lst[counter]['start'], lst[counter], avgSpace);
    counter++;
  }

  for (var i=counter; i<lst.length; i++) {
    console.log(obj);
    var broken = false;
    for (var j=avgSpace; j>=0; j--) {
      for (var k in obj) {
        if (canBePlaced(obj, lst[i]['duration'], k, j)) {
          console.log(j);
          placeObj(obj, lst[i]['duration'], k, j);
          place(calc, lst[i]['duration'], k, lst[i], j);
          broken = true;
          break;
        }
      }
      if (broken) break;
    }
  }

  for (var i=0; i<calc.length; i++) {
    if (calc[i] === " ") calc[i] = null;
  }

  //calendar = calc;
  db.ref('users/' + uid + '/calendar').set(null);
  db.ref('users/' + uid + '/calendar').set(calc);
}

export function setTags(db, uid, obj) {
  db.ref('users/'+uid+'/tags').set(obj);
}

export function numSpaces(total, n) {
  return Math.floor(total/n)-1;
}

export function totalDuration(arr) {
  var total=0;
  for (var i=0; i<arr.length;i++) {
    if (arr[i] && !Object.compare(arr[i], arr[i-1])) total+=arr[i]['duration'];
  }
  return total;
}

export function largestSubarrayIndex(arr) {
  var start=0;
  var max = 0, ind=0;

  for (var i=0; i<arr.length; i++) {
    if (arr[i] != null || arr[start] != null) {
      if (i - start > max) {
        max = i-start;
        ind = start;
      }
      start=i;
    }

    if (i == arr.length-1 && arr[i] == null) {
      if (i - start + 1 > max) {
        max = i-start+1;
        ind = start;
      }
    }
  }
  return [max, ind];
}

export function place(lst, n, ind, elem, space) {
  console.log(n, space);
  for (var i=0; i<n+space; i++) {
    if (i < n) lst[parseInt(ind)+i] = elem;
    else lst[parseInt(ind)+i] = ' ';
  }
}

export function placeObj(obj, n, ind, space) {
  console.log(parseInt(n)+parseInt(space));
  for (var i=0; i<n+space; i++) {
    delete obj[parseInt(ind)+i];
  }
}

export function canBePlaced(obj, n, ind, space) {
  for (var i=0; i<n+space; i++) {
    if (! ((parseInt(ind)+i) in obj)) {
      return false;
    }
  }
  return true;
}

function mergesort(lst) {
  if (lst.length <= 1) {
    return lst;
  }
  return merge(mergesort(lst.slice(0, lst.length/2)), mergesort(lst.slice(lst.length/2, lst.length)));
}

function lessThan(a,b) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;	
  }
  return (a['priority'] < b['priority'] || a['priority'] == b['priority'] && a['duration'] > b['duration'] );
}

function merge(l1, l2) {
  var lt = [], a1 = 0, a2 = 0;
  for (var i=0; i<(l1.length+l2.length); i++) {
    if (a1 < l1.length && lessThan(l1[a1], l2[a2])) {
      lt.push(l1[a1++]);
    } else if (a2 < l2.length && lessThan(l2[a2], l1[a1])) {
      lt.push(l2[a2++]);
    } else if (a2 == l2.length) {
      lt.push(l1[a1++]);
    } else {
      lt.push(l2[a2++]);
    }
  }
  return lt;
}

//Can take event or id, need to decide.
export function moveDown(db, uid, calendar, event) {
  var aFound=false, bFound = false;
  var aStart=0, bStart=0;
  var bEnd=0, b=-1;

  for (var i=0; i<calendar.length; i++) {
    if (! aFound && Object.compare(calendar[i], event)) {
      aFound = true;
      aStart = i;
    } else if (aFound && ! bFound && ! Object.compare(calendar[i], event)) {
      bFound = true;
      bStart = i;
      b = calendar[i];
    } else if (aFound && bFound && ! Object.compare(calendar[i], b)) {
      bEnd = i;
      break;
    } else if (i == calendar.length-1 && aFound && bFound){
      bEnd = i+1;
      break;
    }

    if (aFound && i==calendar.length-1 && calendar[i] == null) {
      bEnd = i+1;
      break;
    }

    if (! b) {
      bEnd = i+1;
      break;
    }
  }

  if (! bFound) {
    db.ref('users/'+uid+'/calendar').set(null);
    db.ref('users/'+uid+'/calendar').set(calendar);	}

  for (var i=bEnd-aStart-1; i>=0; i--) {
    if (bEnd-i-1 < bStart) {
      calendar[aStart+i] = event;
    } else {
      calendar[aStart+i] = b;
    }
  }

  db.ref('users/'+uid+'/calendar').set(null);
  db.ref('users/'+uid+'/calendar').set(calendar);

}

export function startEventListener(db, uid) {
  db.ref('users').child(uid).child('events').on('value', function(snapshot) {
    var evArray = [];

    snapshot.forEach(function (child){
      evArray.push(child.val());
    });

    generateSmartCalendar(db, uid, evArray);
  });
}

export function roundTo15(n) {
  var close = Math.floor(n/15)*15;
  if (n-close <= 7) {
    return close;
  }
  return close + 15;
}

export function createEvent(db, uid, title, description, tag, duration, start=null) {
  db.ref('users/'+uid+'/tags').once('value', function(snapshot) {
    const priority = start ? 0 : snapshot.val()[tag];
    db.ref('users/'+uid+'/events').push().set(
      {
        tag,
        title,
        description,
        priority,
        duration,
        start,

      }
    );
  });
}
