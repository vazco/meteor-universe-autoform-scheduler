'use strict';

AutoForm.addInputType('universe-scheduler', {
    template: 'afUniverseScheduler',
    valueOut: function () {
        return this.val();
    },
    contextAdjust: function (context) {
        var iCalString = context.value;

iCalString = 'FREQ=WEEKLY;DTSTART=20110201T093000Z;INTERVAL=5;UNTIL=20130130T230000Z;BYDAY=MO,FR';
        var iCal = new ICal(iCalString);

        return _.extend(context, iCal.extractForScheduler()); 
    }
});

Template.afUniverseScheduler.onCreated(function () {
    var defaultInterval = getRepetitionOptions()[0];

    this.repetitionInfo = new ReactiveDict();
    
    this.repetitionInfo.set('interval', defaultInterval);

    var monthly = {
        checked: '',
        monthDay: 1,
        setPos: 1,
        day: 'MO'
    }
    
    this.repetitionInfo.set('monthly', monthly);
});

function formatDateForScheduler(moment) {
    return moment.format('MM/DD/YYYY');
}

function ICal (iCalString) {
    var self = this;

    iCalString.split(';').forEach(function (el, i) {
        var pair = el.split('=');
        self[pair[0]] = pair[1];
    });
}

ICal.prototype.extractForScheduler = function () {
    var startDate = ICal.iCalDateToDate(this.DTSTART);
    var endDate = ICal.iCalDateToDate(this.UNTIL);

    return {
        startDate: formatDateForScheduler(moment(startDate)),
        endDate: formatDateForScheduler(moment(endDate))
    };
}

ICal.iCalDateToDate = function (iCalDate) {
    var re = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z)?$/;
    var bits = re.exec(iCalDate);

    if (!bits) {
        throw new Meteor.Error('Invalid iCal (RFC2445) value: ' + iCalDate)
    }

    return new Date(
        Date.UTC(bits[1],
        bits[2] - 1,
        bits[3],
        bits[5] || 0,
        bits[6] || 0,
        bits[7] || 0
    ));
}

Template.registerHelper('generateNumbers', function (start, end, interval) {
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
});

Template.registerHelper('emptyObject', function () {
    return {};
});

Template.afUniverseScheduler.helpers({
    getRepetitionIntervalInfo: function () {
        return Template.instance().repetitionInfo.get('interval');
    },
    repetitionOptions: function () {
        return getRepetitionOptions();
    },
    weeklyOptions: function () {
        var options = [
            getOption('MO', 'Mon'),
            getOption('TU', 'Tue'),
            getOption('WE', 'Wed'),
            getOption('TH', 'Thu'),
            getOption('FR', 'Fri'),
            getOption('SA', 'Sat'),
            getOption('SU', 'Sun')
        ];

        return options;
    },
    isByMonthDay: function () {
        return Template.instance().repetitionInfo.get('monthly').checked === "byMonthDay";
    },
    isByDay: function () {
        return Template.instance().repetitionInfo.get('monthly').checked === "byDay";
    }
});

Template.afUniverseScheduler.events({
    'click .dropdown-menu li': function () {
        var selected = {
            value: this.value,
            label: this.label
        };

        if (this.text) {
            selected.text = this.text;
        }

        Template.instance().repetitionInfo.set('interval', selected);
    },
    'change .js-weekly-option': function (event) {
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
            _.without(activeValues, this.value);
        }

        Template.instance().repetitionInfo.set('weeklyDays', activeValues);
    }
});

function getRepetitionOptions() {
    var options = [
        makeOption("none", "None (run once)"),
        makeOption("HOURLY", "Hourly", "hour(s)"),
        makeOption("DAILY", "Daily", "day(s)"),
        makeOption("WEEKDAYS", "Weekdays"),
        makeOption("WEEKLY", "Weekly", "week(s)"),
        makeOption("MONTHLY", "Monthly"),
        makeOption("YEARLY", "Yearly")
    ];

    return options; 
}

function makeOption(value, label, text) {
    var option = {};

    option.value = value;
    
    if (label) {
        option.label = label;
    } else {
        option.label = value;
    }

    if (text) {
        option.text = text;
    }

    return option;
}

//created reacive
//event zmiana
