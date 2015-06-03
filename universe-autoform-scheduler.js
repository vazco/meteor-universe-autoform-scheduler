'use strict';

var makeOption = function (value, label, data) {
    var option = {};

    option.value = value;

    if (label) {
        option.label = label;
    } else {
        option.label = value;
    }

    if (data) {
        option.data = data;
    }

    return option;
};

var freqOptionsMap = [
    makeOption('NONE', 'None (run once)'),
    makeOption('HOURLY', 'Hourly', {text: 'hour(s)'}),
    makeOption('DAILY', 'Daily', {text: 'day(s)'}),
    makeOption('WEEKDAYS', 'Weekdays'),
    makeOption('WEEKLY', 'Weekly', {text: 'week(s)'}),
    makeOption('MONTHLY', 'Monthly'),
    makeOption('YEARLY', 'Yearly')
];

var bysetposOptions = [
    makeOption(1, 'First'),
    makeOption(2, 'Second'),
    makeOption(3, 'Third'),
    makeOption(4, 'Fourth'),
    makeOption(-1, 'Last')
];

var bysetposBydayOptions = [
    makeOption('MO', 'Monday'),
    makeOption('TU', 'Tuesday'),
    makeOption('WE', 'Wednesday'),
    makeOption('TH', 'Thursday'),
    makeOption('FR', 'Friday'),
    makeOption('SA', 'Saturday'),
    makeOption('SU', 'Sunday'),
    makeOption('MO,TU,WE,TH,FR,SA,SU', 'Day'),
    makeOption('MO,TU,WE,TH,FR', 'Weekday'),
    makeOption('SA,SU', 'Weekend day')
];

var monthsOptions = [
    makeOption(1, 'January'),
    makeOption(2, 'February'),
    makeOption(3, 'March'),
    makeOption(4, 'April'),
    makeOption(5, 'May'),
    makeOption(6, 'June'),
    makeOption(7, 'July'),
    makeOption(8, 'August'),
    makeOption(9, 'September'),
    makeOption(10, 'October'),
    makeOption(11, 'November'),
    makeOption(12, 'December')
];

var endOptions = [
    makeOption('never', 'Never'),
    makeOption('COUNT', 'After'),
    makeOption('UNTIL', 'On date')
];

var weekdaysArr = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

var getField = function (fieldName, value, optionsArr) {
    var result;

    optionsArr.some(function (el) {
        if (RRule[el.value] === value || el.value === value) {
            result = el[fieldName];

            return true;
        }
    });

    return result;
};

var getLabel = _.partial(getField, 'label');
var getValue = _.partial(getField, 'value');
var getData = _.partial(getField, 'data');

//TODO: valueOut
AutoForm.addInputType('universe-scheduler', {
    template: 'afUniverseScheduler',
    valueOut: function () {
        return this.val();
    }/*,
    contextAdjust: function (context) {
        var iCalString = context.value;

        iCalString = 'FREQ=WEEKLY;DTSTART=20110201T093000Z;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR';
        var iCal = new ICal(iCalString);

        return _.extend(context, iCal.extractForScheduler());
    }*/
});

Template.afUniverseScheduler.onCreated(function () { //eslint-disable-line complexity
    var defaultLabel;

    // var options = 'FREQ=WEEKLY;BYDAY=MO,TU,WE;INTERVAL=5;COUNT=1';
    var options = this.value || '';
    var rrule = this.rrule = new RRule(RRule.parseString(options));
    var rruleString = this.rruleString = new ReactiveVar(rrule.toString());

    this.rrule.get = function () {
        return RRule.fromString(rruleString.get());
    };

    this.rrule.set = function (value) {
        var rruleOptions = value.options;

        //hack as NONE and WEEKDAYS freq do not exist
        if (rruleOptions.freq === undefined) {
            rruleOptions.freq = RRule.DAILY;
        }

        //hack, as of aramk:rrule@2.1.0 RRule#optionsToString
        //is parsing wrong when wkst is set, pull request made so
        //hopefully it will be fixed soon
        if (typeof rruleOptions.wkst === 'number') {
            rruleOptions.wkst = RRule[weekdaysArr[rruleOptions.wkst]].toString();
        }

        rruleOptions = purifyRRule(rruleOptions);

        rruleString.set(RRule.optionsToString(rruleOptions));
    };

    var freq = {};

    freq.value = rrule.origOptions.freq;

    var freqOptions = getFreqOptions();

    if (!freq) {
        defaultLabel = freqOptions[0].label;
        this.freqLabel = new ReactiveVar(defaultLabel);
    } else if (isNoneSet(rrule.options)) {
        this.freqLabel = new ReactiveVar(getLabel('NONE', freqOptions));
    } else if (freq.value === RRule.DAILY && rrule.options.byweekday.length > 0) {
        this.freqLabel = new ReactiveVar(getLabel('WEEKDAYS', freqOptions));
    } else {
        this.freqLabel = new ReactiveVar(getLabel(freq.value, freqOptions));

        freq.freqData = getData(freq.value, freqOptions);
        freq.text = freq.freqData ? freq.freqData.text : undefined;
    }

    this.freqText = new ReactiveVar(freq.text);

    var weeklyWeekdays = mapByweekdayToString(rrule.options.byweekday);
    this.weeklyWeekdays = new ReactiveVar(weeklyWeekdays);

    var bymonthday = isOptionSet(rrule.options, 'bymonthday') ? rrule.options.bymonthday : [1];
    this.bymonthday = new ReactiveVar(bymonthday);

    var bysetpos = isOptionSet(rrule.options, 'bysetpos') ? rrule.options.bysetpos : 1;
    this.bysetpos = new ReactiveVar(bysetpos);

    this.bysetposByday = new ReactiveVar();

    if (isOptionSet(rrule.options, 'bysetpos')) {
        this.bysetposByday.set(rrule.options.byweekday);
    }

    var yearlyBymonthdayBymonth = isOptionSet(rrule.options, 'bymonth', 'bymonthday') ? rrule.options.bymonth : 1;
    this.yearlyBymonthdayBymonth = new ReactiveVar(yearlyBymonthdayBymonth);

    var yearlyBymonthday;
    var yearlyBysetpos;
    var yearlyBysetposByweekday;
    var yearlyBysetposBymonth;

    if (freq.value === RRule.YEARLY) {
        yearlyBymonthday = isOptionSet(rrule.options, 'bymonthday') ? rrule.options.bymonthday : 1;
        yearlyBysetpos = isOptionSet(rrule.options, 'bysetpos') ? rrule.options.bysetpos : 1;
        yearlyBysetposByweekday = isOptionSet(rrule.options, 'bysetpos', 'byweekday') ? rrule.options.byweekday : [RRule.MO];
        yearlyBysetposBymonth = isOptionSet(rrule.options, 'bysetpos', 'bymonth') ? rrule.options.bymonth : 1;
    }

    this.yearlyBymonthday = new ReactiveVar(yearlyBymonthday || 1);
    this.yearlyBysetpos = new ReactiveVar(yearlyBysetpos || 1);
    this.yearlyBysetposByweekday = new ReactiveVar(yearlyBysetposByweekday || [RRule.MO]);
    this.yearlyBysetposBymonth = new ReactiveVar(yearlyBysetposBymonth || 1);

    var endOption;

    if (isOptionSet(rrule.options, 'until')) {
        endOption = 'UNTIL';
    } else if (isOptionSet(rrule.options, 'count') && !isNoneSet(rrule.options)) {
        endOption = 'COUNT';
    }

    this.endOption = new ReactiveVar(endOption || 'never');

    this.until = new ReactiveVar(rrule.options.until);
    this.count = new ReactiveVar(rrule.options.count);

    this.interval = new ReactiveVar(rrule.options.interval || 1);

    //YEARLY and MONTHLY states
    if (freq.value === RRule.MONTHLY) {
        if (isOptionSet(rrule.options, 'bymonthday')) {
            this.monthlyState = new ReactiveVar('bymonthday');
        } else if (isOptionSet(rrule.options, 'bysetpos', 'byweekday')) {
            this.monthlyState = new ReactiveVar('bysetposByweekday');
        }
    } else {
        this.monthlyState = new ReactiveVar();
    }

    if (freq.value === RRule.YEARLY) {
        if (isOptionSet(rrule.options, 'bymonth', 'bymonthday')) {
            this.yearlyState = new ReactiveVar('bymonthBymonthday');
        } else if (isOptionSet(rrule.options, 'bysetpos', 'byweekday', 'bymonth')) {
            this.yearlyState = new ReactiveVar('bysetposByweekdayBymonth');
        }
    } else {
        this.yearlyState = new ReactiveVar();
    }
});

Template.afUniverseScheduler.onRendered(function () {
    var self = this;

    this.autorun(function () {
        var rrule = self.rrule.get();

        //TODO: purify rrule, clear all undisplayed or unchecked fields
        // console.log('autorun');
        // console.log(rrule);
        self.$('[data-schema-key]').val(self.rruleString.get());
    });
});

var formatDate = function (date) {
    date = ensureMoment(date);

    return date.format('MM/DD/YYYY');
};

var ensureMoment = function (date) {
    if (!(date instanceof moment)) {
        return moment(date);
    }

    return date;
};

var generateNumbers = function (start, end, interval) {
    check(start, Number);
    check(end, Number);

    if (!_.isNumber(interval)) {
        interval = 1;
    }

    var numbers = [];
    var i;

    for (i = start; i < end; i += interval) {
        numbers.push(i);
    }

    return numbers;
};

var daysNumbersOptions = generateNumbers(1, 31).map(function (el) {
    return makeOption(el);
});

Template.registerHelper('emptyObject', function () {
    return {};
});

Template.afUniverseScheduler.helpers({
    getRRule: function () {
        return Template.instance().rrule.get().options;
    },
    getDtstart: function () {
        var dtstart = Template.instance().rrule.get().options.dtstart;

        return formatDate(dtstart);
    },
    getFreq: function () {
        return getValue(this.freq, freqOptionsMap);
    },
    getFreqLabel: function () {
        return Template.instance().freqLabel.get();
    },
    getFreqText: function () {
        return Template.instance().freqText.get();
    },
    hasWeekday: function () {
        var weeklyWeekdays = Template.instance().weeklyWeekdays.get().split(',');

        return weeklyWeekdays.indexOf(this.value) !== -1 ? true : false;
    },
    freqOptions: function () {
        return getFreqOptions();
    },
    weeklyOptions: function () {
        var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var options = [];

        weekdaysArr.forEach(function (el, i) {
            options.push(makeOption(weekdaysArr[i], labels[i]));
        });

        return options;
    },
    bymonthdayOptions: function () {
        return daysNumbersOptions;
    },
    isOptionSet: function () {
        var optionNames = Array.prototype.slice.call(arguments, 0, -1); //discard Spacebars.kw
        var options = Template.instance().rrule.get().options;

        return isOptionSet(options, optionNames);
    },
    getBymonthdayValue: function () {
        return Template.instance().bymonthday.get()[0] || 1;
    },
    bysetposOptions: function () {
        return bysetposOptions;
    },
    getBysetposValue: function () {
        var value = Template.instance().bysetpos.get();

        return value ? value : 1;
    },
    getBysetposLabel: function () {
        var value = Template.instance().bysetpos.get();
        var label = getLabel(value, bysetposOptions);

        return label ? label : getLabel(1, bysetposOptions);
    },
    bysetposBydayOptions: function () {
        return bysetposBydayOptions;
    },
    getBysetposBydayValue: function () {
        var value = Template.instance().bysetposByday.get();

        return value ? value : RRule.MO;
    },
    getBysetposBydayLabel: function () {
        var bysetposByday = Template.instance().bysetposByday.get();
        var mappedString = mapByweekdayToString(bysetposByday);
        var label = getLabel(mappedString, bysetposBydayOptions);

        return label ? label : getLabel('MO', bysetposBydayOptions);
    },
    monthsOptions: function () {
        return monthsOptions;
    },
    getBymonthdayBymonthLabel: function () {
        var value = Template.instance().yearlyBymonthdayBymonth.get();
        var label = getLabel(value, monthsOptions);

        return label ? label : getLabel(1, monthsOptions);
    },
    getBymonthdayLabel: function () {
        var yearlyBymonthday = Template.instance().yearlyBymonthday.get();
        var value = _.isArray(yearlyBymonthday) ? yearlyBymonthday[0] : yearlyBymonthday;
        var label = getLabel(value, daysNumbersOptions);

        return label ? label : getLabel(1, daysNumbersOptions);
    },
    getBysetposBymonthLabel: function () {
        var value = Template.instance().yearlyBysetposBymonth.get();
        var label = getLabel(value, monthsOptions);

        return label ? label : getLabel(1, monthsOptions);
    },
    getYearlyBysetposLabel: function () {
        var value = Template.instance().yearlyBysetpos.get();
        var label = getLabel(value, bysetposOptions);

        return label ? label : getLabel(1, bysetposOptions);
    },
    getYearlyByweekdayLabel: function () {
        var value = Template.instance().yearlyBysetposByweekday.get();
        var mappedString = mapByweekdayToString(value);
        var label = getLabel(mappedString, bysetposBydayOptions);

        return label ? label : getLabel('MO', bysetposBydayOptions);
    },
    endOptions: function () {
        return endOptions;
    },
    getEndLabel: function () {
        var value = Template.instance().endOption.get();
        var label = getLabel(value, endOptions);

        return label ? label : getLabel('never', endOptions);
    },
    getEndValue: function () {
        return Template.instance().endOption.get();
    },
    getUntil: function () {
        var until = Template.instance().until.get();

        return formatDate(until || '');
    },
    getCount: function () {
        return Template.instance().count.get();
    },
    getInterval: function () {
        return Template.instance().interval.get();
    },
    isNoneSet: function () {
        var options = Template.instance().rrule.get().options;

        return isNoneSet(options);
    },
    isState: function (type, desiredState) {
        return Template.instance()[type].get() === desiredState;
    }
});

Template.afUniverseScheduler.events({
    'click #js-freq li': function (event, template) {
        var rrule = template.rrule.get();

        if (this.value === 'NONE') {
            rrule.options.count = 1;
            rrule.options.interval = 1;

            rrule.options.byweekday = [];
        } else if (this.value === 'WEEKDAYS') {
            rrule.options.count = null;
            rrule.options.interval = 1;

            rrule.options.byweekday = weekdaysArr.slice(0, -2).map(function (el) {
                return RRule[el];
            });
        } else {
            rrule.options.count = null;
            rrule.options.interval = null;
        }

        rrule.options.freq = RRule[this.value];

        rrule = assignProperties(rrule, template);
        template.rrule.set(rrule);

        template.freqLabel.set(this.label);

        if (this.data) {
            template.freqText.set(this.data.text);
        } else {
            template.freqText.set(null);
        }
    },
    'change .js-weekly-option': function (event, template) {
        //active class is added some time after this callback
        //therefore logic is somewhat reversed -
        //$actives won't catch just checked option
        var weeklyWeekdays = template.weeklyWeekdays.get();

        // "".split(separator) returns [""]
        var activeValues = weeklyWeekdays.length > 0 ? weeklyWeekdays.split(',') : [];

        if ($(event.target).prop('checked')) {
            activeValues.push(this.value);
        } else {
            activeValues = _.without(activeValues, this.value);
        }

        var rrule = template.rrule.get();

        var byweekday = activeValues.map(function (el) {
            return RRule[el];
        });

        template.weeklyWeekdays.set(activeValues.join(','));

        rrule.options.byweekday = byweekday;
        template.rrule.set(rrule);
    },
    'change #js-monthly-row [type="radio"]': function (event, template) {
        var value = $(event.target).val();
        var rrule = template.rrule.get();
        var bymonthday = template.bymonthday.get();
        var bysetpos = template.bysetpos.get();

        if (value === 'bysetpos') {
            rrule.options.bymonthday = [];
            rrule.options.bysetpos = bysetpos;

            template.monthlyState.set('bysetposByweekday');
        } else {
            rrule.options.bymonthday = bymonthday;
            rrule.options.bysetpos = null;

            template.monthlyState.set('bymonthday');
        }

        template.rrule.set(rrule);
    },
    'click #js-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var value = [this.value];

        if (isOptionSet(rrule.options, 'bymonthday')) {
            rrule.options.bymonthday = value;
            template.rrule.set(rrule);
        }

        template.bymonthday.set(value);
    },
    'click #js-bysetpos li': function (event, template) {
        var rrule = template.rrule.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.bysetpos = value;
            template.rrule.set(rrule);
        }

        template.bysetpos.set(value);
    },
    'click #js-bysetpos-byday li': function (event, template) {
        var rrule = template.rrule.get();
        var value = mapByweekdayStringToArray(this.value);

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.byweekday = value;
            template.rrule.set(rrule);
        }

        template.bysetposByday.set(value);
    },
    'click #js-yearly-row [type="radio"]': function (event, template) {
        var value = $(event.target).val();
        var rrule = template.rrule.get();

        var yearlyBymonthdayBymonth = template.yearlyBymonthdayBymonth.get();
        var yearlyBymonthday = template.yearlyBymonthday.get();

        var yearlyBysetpos = template.yearlyBysetpos.get();
        var yearlyBysetposByweekday = template.yearlyBysetposByweekday.get();
        var yearlyBysetposBymonth = template.yearlyBysetposBymonth.get();

        if (value === 'bysetpos') {
            rrule.options.bymonthday = [];
            rrule.options.bymonth = yearlyBysetposBymonth;

            rrule.options.bysetpos = yearlyBysetpos;
            rrule.options.byweekday = [RRule[yearlyBysetposByweekday]];

            template.yearlyState.set('bysetposByweekdayBymonth');
        } else {
            rrule.options.bymonthday = [yearlyBymonthday];
            rrule.options.bymonth = yearlyBymonthdayBymonth;

            rrule.options.bysetpos = null;
            rrule.options.byweekday = [];

            template.yearlyState.set('bymonthBymonthday');
        }

        template.rrule.set(rrule);
    },
    'click #js-bymonth-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bymonth', 'bymonthday')) {
            rrule.options.bymonth = value;
            template.rrule.set(rrule);
        }

        template.yearlyBymonthdayBymonth.set(value);
    },
    'click #js-yearly-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var value = [this.value];

        if (isOptionSet(rrule.options, 'bymonth', 'bymonthday')) {
            rrule.options.bymonthday = value;
            template.rrule.set(rrule);
        }

        template.yearlyBymonthday.set(value);
    },
    'click #js-bysetpos-bymonth li': function (event, template) {
        var rrule = template.rrule.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos', 'bymonth')) {
            rrule.options.bymonth = value;
            template.rrule.set(rrule);
        }

        template.yearlyBysetposBymonth.set(value);
    },
    'click #js-yearly-bysetpos li': function (event, template) {
        var rrule = template.rrule.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.bysetpos = value;
            template.rrule.set(rrule);
        }

        template.yearlyBysetpos.set(value);
    },
    'click #js-yearly-byweekday li': function (event, template) {
        var rrule = template.rrule.get();
        var value = mapByweekdayStringToArray(this.value);

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.byweekday = value;
            template.rrule.set(rrule);
        }

        template.yearlyBysetposByweekday.set(value);
    },
    'changeDate #js-dtstart': function (event, template) {
        var rrule = template.rrule.get();
        rrule.options.dtstart = event.date;
        template.rrule.set(rrule);
    },
    'click #js-end li': function (event, template) {
        var rrule = template.rrule.get();
        var until = template.until.get();
        var count = template.count.get();
        var value = this.value;

        template.endOption.set(value);

        if (value === 'COUNT') {
            count = count ? count : 1;

            rrule.options.until = null;
            rrule.options.count = count;

            template.count.set(count);

        } else if (value === 'UNTIL') {
            until = until ? until : new Date();

            rrule.options.until = until;
            rrule.options.count = null;

            template.until.set(until);

        } else {
            rrule.options.until = null;
            rrule.options.count = null;
        }

        template.rrule.set(rrule);
    },
    'changeDate #js-until': function (event, template) {
        var rrule = template.rrule.get();
        var value = event.date;

        rrule.options.until = value;
        template.rrule.set(rrule);

        template.until.set(value);
    },
    'keyup, mouseup .css-js-3-digits': function (event, template) {
        var $target = $(event.target);
        var rrule = template.rrule.get();
        var value = Number.parseInt($target.val());
        var name = $target.attr('name');
        var result;

        if (_.isNumber(value) && value > 0) {
            result = value;
        } else {
            result = 1;
        }

        template[name].set(result);

        rrule.options[name] = result;
        template.rrule.set(rrule);
    }
});

var getFreqOptions = function () {
    return freqOptionsMap;
};

var isOptionSet = function (options, optionNames) {
    if (!_.isArray(optionNames)) {
        optionNames = [];

        Array.prototype.slice.call(arguments, 1).forEach(function (el) {
            optionNames.push(el);
        });
    }

    var i;
    var optionName;
    var option;

    for (i = 0; i < optionNames.length; ++i) {
        optionName = optionNames[i];
        option = options[optionName];

        if (_.isArray(option) && option.length === 0) {
            return false;
        }

        if (!option && option !== 0) {
            return false;
        }
    }

    return true;
};

var mapByweekdayToString = function (arr) {
    var value;

    if (arr) {
        value = arr.map(function (el) {
            if (el.weekday) {
                return weekdaysArr[el.weekday];
            }

            return weekdaysArr[el];
        }).join(',');

        return value;
    }
};

var mapByweekdayStringToArray = function (string) {
    var value = string.split(',').map(function (el) {
        return RRule[el];
    });

    return value;
};


var isNoneSet = function (options) {
    if (options.freq === RRule.DAILY &&
        options.interval === 1 &&
        options.count === 1 &&
        (!options.byweekday ||
        options.byweekday.length === 0)) {

        return true;
    }

    return false;
};

var purifyRRule = (function () {
    //this scheduler can use only combinations of these options:
    //dtstart,freq,byweekday,bymonthday,bysetpos,bymonth,until,count,interval
    var purifyMap = {
        all: [
            'byeaster',
            'byhour',
            'byminute',
            'bynmonthday',
            'bynweekday',
            'bysecond',
            'byweekno',
            'byyearday'
        ],
        none: [
            'byweekday',
            'bymonthday',
            'bysetpos',
            'bymonth',
            'until'
        ],
        hourly: [
            'byweekday',
            'bymonthday',
            'bysetpos',
            'bymonth'
        ],
        daily: [
            'byweekday',
            'bymonthday',
            'bysetpos',
            'bymonth'
        ],
        weekdays: [
            'bymonthday',
            'bysetpos',
            'bymonth',
            'interval'
        ],
        weekly: [
            'bymonthday',
            'bysetpos',
            'bymonth'
        ],
        monthly: [
            'bymonth',
            'interval'
        ],
        yearly: [
            'interval'
        ]
    };

    return function (options) {
        var purifyFreq;

        if (isNoneSet(options)) {
            purifyFreq = 'none';
        } else if (options.freq === RRule.DAILY && options.byweekday && options.byweekday.length === 5) {
            purifyFreq = 'weekdays';
        } else {
            purifyFreq = RRule.FREQUENCIES[options.freq].toLowerCase();
        }

        purifyMap.all.forEach(function (el) {
            options[el] = null;
        });

        purifyMap[purifyFreq].forEach(function (el) {
            options[el] = null;
        });

        return options;
    };
})();

var assignProperties = function (rrule, template) {
    var options = rrule.options;

    if (options.freq === RRule.HOURLY ||
        options.freq === RRule.DAILY ||
        options.freq === RRule.WEEKLY) {

        options.interval = template.interval.get();
    } else if (options.freq === RRule.MONTHLY ||
        options.freq === RRule.YEARLY) {

        options.bymonthday = [];
        options.bysetpos = [];
        options.byweekday = [];
    }

    if (options.freq === RRule.WEEKLY) {
        options.byweekday = mapByweekdayStringToArray(template.weeklyWeekdays.get());
    }

    var endOption;
    //freq might be undefined for NONE and WEEKDAYS,
    //from those 2 only WEEKDAYS might have byweekday set
    if (options.freq || (options.byweekday && options.byweekday.length === 5)) {
        endOption = template.endOption.get();

        if (endOption === 'COUNT') {
            options.count = template.count.get();
        } else if (endOption === 'UNTIL') {
            options.until = template.until.get();
        }
    }

    return rrule;
};

//TODO: count w yearly
//https://bitbucket.org/vazco/mp_pnyx/src/909b8bec4826843c53f2979ba383d42508898b70/mods/rooms/lib/collections/Rooms.js?at=master
//value out tlyko active
//https://bitbucket.org/vazco/mp_pnyx/src/909b8bec4826843c53f2979ba383d42508898b70/mods/rooms/components/roomsTimelineFilter/client/roomsTimelineFilter_templateTags.js?at=master
