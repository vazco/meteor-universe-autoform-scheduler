'use strict';

$.fn._universeDatepicker = $.fn.datepicker; //hijack this package datepicker
$.fn._universeDatetimepicker = $.fn.datetimepicker; //hijack this package datepicker

Template.afUniverseBootstrapDatepicker.helpers({
    atts: function () {
        var atts = _.clone(this.atts);
        // Add bootstrap class
        atts = AutoForm.Utility.addClass(atts, 'form-control');
        delete atts.datePickerOptions;

        return atts;
    }
});

Template.afUniverseBootstrapDatepicker.onRendered(function () {
    var $input = this.data.atts.buttonClasses ? this.$('.input-group.date') : this.$('input');
    var data = this.data;
    // instanciate datepicker
    var datepicker;
    if (data.id === 'js-until') {
        $input._universeDatepicker(data.atts.datePickerOptions);
        datepicker = $input.data('datepicker');
    } else {
        $input._universeDatetimepicker(data.atts.datePickerOptions);
        datepicker = $input.data('DateTimePicker');
    }

    // set and reactively update values
    this.autorun(function () {
        var data = Template.currentData();
        // set field value
        if (data.value instanceof Date) {
            // $input._universeDatepicker('setUTCDate', data.value);
            datepicker.date(data.value);
        } else if (typeof data.value === 'string') {
            // $input._universeDatepicker('update', data.value);
            datepicker.date(data.value);
        }
        // set start date if there's a min in the schema
        if (data.min instanceof Date) {
            // datepicker plugin expects local Date object,
            // so convert UTC Date object to local
            var startDate = utcToLocal(data.min);
            // $input._universeDatepicker('setStartDate', startDate);
            datepicker.minDate(startDate);
        }
        // set end date if there's a max in the schema
        if (data.max instanceof Date) {
            // datepicker plugin expects local Date object,
            // so convert UTC Date object to local
            var endDate = utcToLocal(data.max);
            // $input._universeDatepicker('setEndDate', endDate);
            datepicker.maxDate(endDate);
        }
    });
});

Template.afUniverseBootstrapDatepicker.onDestroyed(function () {
    var $input = this.data.atts.buttonClasses ? this.$('.input-group.date') : this.$('input');

    var picker = $input.data('DateTimePicker');

    if (picker) {
        picker.destroy();
    }
});

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
