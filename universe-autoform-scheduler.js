//TODO: 3x DAILY freq, what are the consequences, especially when loading rrule from the DB

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

var freqOptions = [
    makeOption('NONE', 'None (run once)'),
    makeOption('HOURLY', 'Hourly', { text: 'hour(s)' }),
    makeOption('DAILY', 'Daily', { text: 'day(s)' }),
    makeOption('WEEKDAYS', 'Weekdays'),
    makeOption('WEEKLY', 'Weekly', { text: 'week(s)' }),
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

var weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

var getField = function (fieldName, value, optionsArr) {
    var result;

    optionsArr.some(function (el) {
        if (RRule[el.value] === value || el.value === value) {
            // console.log('el.value')
            // console.log(el.value)
            result = el[fieldName];
            return true;
        }
    });

    return result;
};

var getLabel    = _.partial(getField, 'label');
var getValue    = _.partial(getField, 'value');
var getData     = _.partial(getField, 'data');
// function (value, optionsArr) {
//     return getField('label', value, optionsArr);
// };

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


Template.afUniverseScheduler.onCreated(function () {

    // console.log('template this')
    // console.log(this)

    var options = 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=1;COUNT=10';
    var rrule = this.rrule = new RRule(RRule.parseString(options));
    var rruleString = new ReactiveVar(rrule.toString());

    this.rrule.get = function () {
        // console.log('GET');
        // console.log(rruleString.get())
        // if (typeof options.wkst === 'number') {

        // }
        // console.log(new RRule(RRule.parseString(rruleString.get())))
        //FREQ=YEARLY;DTSTART=20110201T093000Z;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=TH;WKST=0;BYHOUR=10;BYMINUTE=30;BYSECOND=0
        // return new RRule(RRule.parseString(rruleString.get()));


        return RRule.fromString(rruleString.get());
    };

    this.rrule.set = function (value) {
        var options = value.options;

        if (!options.freq) {
            options.freq = RRule.DAILY;
        }
        //hack, as of aramk:rrule@2.1.0 RRule#optionsToString
        //is parsing wrong when wkst is set, pull request made so
        //hopefully it will be fixed soon
        if (typeof options.wkst === 'number') {
            // console.log(options.wkst)
            options.wkst = RRule[weekdays[options.wkst]].toString();
        }
        // console.log('set');
        // debugger;
        // console.log(value);
        // console.log(RRule.optionsToString(value.options));
        // console.log('wyjebka')

            // console.log('SET')
            // console.log(options)
        rruleString.set(RRule.optionsToString(options));
    };

    // this.rrule = new ReactiveVar(rrule.toString());
//     var _set = this.rrule.set;
//     this.rrule.set = function(){
//         debugger;
//         return _set.apply(this, arguments);
//     };
// this.rrule.set(rrule);
    var freq = {};
    freq.value = rrule.origOptions.freq;

    var freqOptions = getFreqOptions();

    if (!freq) {
        var defaultLabel = freqOptions[0].label
        this.freqLabel = new ReactiveVar(defaultLabel);
    } else if (freq === RRule.DAILY && rrule.options.byweekday.length > 0) {
        this.freqLabel = new ReactiveVar(getLabel('WEEKDAYS', freqOptions));
    } else {
        this.freqLabel = new ReactiveVar(getLabel(freq.value, freqOptions));
    }

    freq.freqData = getData(freq.value, freqOptions);
    freq.text = freq.freqData ? freq.freqData.text : undefined;
    this.freqText = new ReactiveVar(freq.text);


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

    if (freq.value === RRule['YEARLY']) {
        yearlyBymonthday = isOptionSet(rrule.options, 'bymonthday') ? rrule.options.bymonthday : 1;
        yearlyBysetpos = isOptionSet(rrule.options, 'bysetpos') ? rrule.options.bysetpos : 1;
        yearlyBysetposByweekday = isOptionSet(rrule.options, 'bysetpos', 'byweekday') ? rrule.options.byweekday : [RRule['MO']];
        yearlyBysetposBymonth = isOptionSet(rrule.options, 'bysetpos', 'bymonth') ? rrule.options.bymonth : 1;
    }

    this.yearlyBymonthday = new ReactiveVar(yearlyBymonthday || 1);
    this.yearlyBysetpos = new ReactiveVar(yearlyBysetpos || 1);
    this.yearlyBysetposByweekday = new ReactiveVar(yearlyBysetposByweekday || [RRule['MO']]);
    this.yearlyBysetposBymonth = new ReactiveVar(yearlyBysetposBymonth || 1);

    var endOption;

    if (isOptionSet(rrule.options, 'until')) {
        endOption = "UNTIL";
    } else if (isOptionSet(rrule.options, 'count')) {
        endOption = "COUNT";
    }

    this.endOption = new ReactiveVar(endOption || 'never');

    this.until = new ReactiveVar(rrule.options.until);
    this.count = new ReactiveVar(rrule.options.count);

    this.interval = new ReactiveVar(rrule.options.interval || 1);
});

Template.afUniverseScheduler.onRendered(function () {
    var self = this;

    this.autorun(function () {
        // console.log(self.rrule);
        var rrule = self.rrule.get();
        //TODO: purify rrule, clear all undisplayed or unchecked fields
        console.log('autorun')
        console.log(rrule);
        self.$('[data-schema-key]').val(RRule.optionsToString(rrule.options));
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

    for (var i = start; i < end; i += interval) {
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
        // console.log('GETRRULE')
        // console.log(Template.instance().rrule.get())
        // console.log('END')
        return Template.instance().rrule.get().options;
    },
    getDtstart: function () {
        // console.log('dtstart')
        // if (counter > 5) {
        // console.log('dtstart2222')
            var dtstart = Template.instance().rrule.get().options.dtstart;
            return formatDate(dtstart);
        // }

        // console.log('dtstart3333')
        // ++counter;
        // return Session.get('datePicker');
    },
    getFreq: function () {
        // console.log('GETFREQ')
        // console.log(this)
        return getValue(this.freq, freqOptions);
    },
    getFreqLabel: function () {
        return Template.instance().freqLabel.get();
    },
    getFreqText: function () {
        return Template.instance().freqText.get();
    },
    hasWeekday: function () {
        var weekdays = Template.instance().rrule.get().options.byweekday;
        // console.log('HASWEEKDAY')
        // console.log(this.value)
        // console.log(RRule[this.value])
        var value = RRule[this.value].weekday;

        if (!!weekdays) {
            if (_.isNumber(weekdays[0])) {
                var index = weekdays.indexOf(value);

                return index >= 0 ? true : false;
            }

            for (var i = 0; i < weekdays.length; ++i) {
                if (weekdays[i].weekday === value) {
                    return true;
                }
            }
        }

        return false;
    },
    freqOptions: function () {
        return getFreqOptions();
    },
    weeklyOptions: function () {
        var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var options = [];

        weekdays.forEach(function (el, i) {
            options.push(makeOption(weekdays[i], el));
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
        // console.log('getBysetposLabel')
        // console.log(value)
        // console.log(label)
        // console.log(getLabel(1, bysetposOptions));
        return label ? label : getLabel(1, bysetposOptions);
    },
    bysetposBydayOptions: function () {
        return bysetposBydayOptions;
    },
    getBysetposBydayValue: function () {
        var value = Template.instance().bysetposByday.get();

        return value ? value : RRule['MO'];
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
    }
});

Template.afUniverseScheduler.events({
    'click #js-freq li': function (event, template) {
        var rrule = template.rrule.get();
        rrule.options.freq = RRule[this.value];
        template.rrule.set(rrule);

        template.freqLabel.set(this.label);

        if (this.data) {
            template.freqText.set(this.data.text);
        } else {
            template.freqText.set(undefined);
        }
    },
    'change .js-weekly-option': function (event, template) {
        //active class is added some time after this callback
        //therefore logic is somewhat reversed -
        //$actives won't catch just checked option
        var $actives = $('.js-weekly-option.active');

        var activeValues = _.map($actives, function (el, i) {
            return $(el).children('input').data('value');
        });

        if ($(event.target).prop('checked')) {
            activeValues.push(this.value);
        } else {
            activeValues = _.without(activeValues, this.value);
        }

        var rrule = template.rrule.get();

        var byweekday = activeValues.map(function (el) {
            return RRule[el];
        });

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
        } else {
            rrule.options.bymonthday = bymonthday;
            rrule.options.bysetpos = null;
        }

        template.rrule.set(rrule);
    },
    'click #js-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var bymonthday = template.rrule.get();
        var value = [this.value];

        if (isOptionSet(rrule.options, 'bymonthday')) {
            rrule.options.bymonthday = value;
            template.rrule.set(rrule);
        }

        template.bymonthday.set(value);
    },
    'click #js-bysetpos li': function (event, template) {
        var rrule = template.rrule.get();
        var bysetpos = template.bysetpos.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.bysetpos = value;
            template.rrule.set(rrule);
        }

        template.bysetpos.set(value);
    },
    'click #js-bysetpos-byday li': function (event, template) {
        var rrule = template.rrule.get();
        var bysetposByday = template.bysetposByday.get();
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
        } else {
            rrule.options.bymonthday = [yearlyBymonthday];
            rrule.options.bymonth = yearlyBymonthdayBymonth;

            rrule.options.bysetpos = null;
            rrule.options.byweekday = [];
        }

        template.rrule.set(rrule);
    },
    'click #js-bymonth-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var yearlyBymonthdayBymonth = template.yearlyBymonthdayBymonth.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bymonth', 'bymonthday')) {
            rrule.options.bymonth = value;
            template.rrule.set(rrule);
        }

        template.yearlyBymonthdayBymonth.set(value);
    },
    'click #js-yearly-bymonthday li': function (event, template) {
        var rrule = template.rrule.get();
        var yearlyBymonthday = template.yearlyBymonthday.get();
        var value = [this.value];

        if (isOptionSet(rrule.options, 'bymonth', 'bymonthday')) {
            rrule.options.bymonthday = value;
            template.rrule.set(rrule);
        }

        template.yearlyBymonthday.set(value);
    },
    'click #js-bysetpos-bymonth li': function (event, template)  {
        var rrule = template.rrule.get();
        var yearlyBysetposBymonth = template.yearlyBysetposBymonth.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos', 'bymonth')) {
            rrule.options.bymonth = value;
            template.rrule.set(rrule);
        }

        template.yearlyBysetposBymonth.set(value);
    },
    'click #js-yearly-bysetpos li': function (event, template) {
        var rrule = template.rrule.get();
        var yearlyBysetpos = template.yearlyBysetpos.get();
        var value = this.value;

        if (isOptionSet(rrule.options, 'bysetpos')) {
            rrule.options.bysetpos = value;
            template.rrule.set(rrule);
        }

        template.yearlyBysetpos.set(value);
    },
    'click #js-yearly-byweekday li': function (event, template) {
        var rrule = template.rrule.get();
        var yearlyBysetposByweekday = template.yearlyBysetposByweekday.get();
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
        var count = template.count.get()
        var value = this.value;

        template.endOption.set(value);

        if (value === "COUNT") {
            count = !!count ? count : 1;

            rrule.options.until = null;
            rrule.options.count = count;

            template.count.set(count);
        } else if (value === "UNTIL") {
            until = !!until ? until : new Date();

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

        template[name].set(value);

        rrule.options[name] = value;
        template.rrule.set(rrule);
    }
});

var getFreqOptions = function () {
    return freqOptions;
};

var isOptionSet = function (options, optionNames) {
    if (!_.isArray(optionNames)) {
        optionNames = [];

        Array.prototype.slice.call(arguments, 1).forEach(function (el) {
            optionNames.push(el);
        });
    }

    for (var i = 0; i < optionNames.length; ++i) {
        var optionName = optionNames[i];
        var option = options[optionName];

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
    if (!!arr) {
        var value = arr.map(function (el) {
            if (!!el.weekday) {
                return weekdays[el.weekday];
            }

            return weekdays[el];
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

$.fn._universeDatepicker = $.fn.datepicker;

Template.afUniverseBootstrapDatepicker.helpers({
    atts: function () {
        var atts = _.clone(this.atts);
        // Add bootstrap class
        atts = AutoForm.Utility.addClass(atts, "form-control");
        delete atts.datePickerOptions;

        return atts;
    }
});

Template.afUniverseBootstrapDatepicker.rendered = function () {
    var $input = this.data.atts.buttonClasses ? this.$('.input-group.date') : this.$('input');
    var data = this.data;
    // instanciate datepicker
    $input._universeDatepicker(data.atts.datePickerOptions);
    // set and reactively update values
    this.autorun(function () {
        var data = Template.currentData();
        // set field value
        if (data.value instanceof Date) {
            $input._universeDatepicker('setUTCDate', data.value);
        } else if (typeof data.value === "string") {
            $input._universeDatepicker('update', data.value);
        }
        // set start date if there's a min in the schema
        if (data.min instanceof Date) {
            // datepicker plugin expects local Date object,
            // so convert UTC Date object to local
            var startDate = utcToLocal(data.min);
            $input._universeDatepicker('setStartDate', startDate);
        }
        // set end date if there's a max in the schema
        if (data.max instanceof Date) {
            // datepicker plugin expects local Date object,
            // so convert UTC Date object to local
            var endDate = utcToLocal(data.max);
            $input._universeDatepicker('setEndDate', endDate);
        }
    });
};

Template.afUniverseBootstrapDatepicker.destroyed = function () {
    var $input = this.data.atts.buttonClasses ? this.$('.input-group.date') : this.$('input');
    $input._universeDatepicker('remove');
};

var utcToLocal = function (utcDate) {
    var localDateObj = new Date();

    localDateObj.setDate(utcDate.getUTCDate());
    localDateObj.setMonth(utcDate.getUTCMonth());
    localDateObj.setFullYear(utcDate.getUTCFullYear());
    localDateObj.setHours(0);
    localDateObj.setMinutes(0);
    localDateObj.setSeconds(0);
    localDateObj.setMilliseconds(0);

    return localDateObj;
};
