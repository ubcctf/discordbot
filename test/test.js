const assert = require('chai').assert;


emailAddressTestCases = [
    
    // Shay's test cases
    [false, "xomeh58775@j24blog.com,test@a.ubc.aaaaaaaaaaaaaaaaaaaaaaa@ubc.ca"],
    [false, "aaaaaaaaaaaaaaaaa@aaaaaa@ubc.ca"],
    [false, "aaaaaaaaaaaaaaaaaaaaaaa@......ubc.@ubc.ca"],
    [false, "a+@ubc.ca"],
    [false, "ubc.ca"],
    [false, "@ubc.ca.com"],
    [false, "*@ubc.ca"],
    [false, "test@aubc.ca"],
    [false, "test@ūbc.ca"],
    [false, "test@a…ubc.ca"],
    [false, "test@u.ubc-ca"],
    [false, "test@@@@"],
    [true,  "noreply@ubc.ca"],

    // My test cases
    [false, ""],
    [false, "@"],
    [false, "@@"],
    [false, "a.a"],
    [false, "a@a"],
    [false, "maple-bacon@student.ubc.ca"],
    [true,  "maple@student.ubc.ca"],
    [true,  "maple@ubc.ca"],
    [true,  "maple@cs.ubc.ca"],
    [true,  "maple@cs.students.ubc.ca"],
    [true,  "maple.bacon@cs.students.ubc.ca"],
    [true,  "maple_bacon@cs.students.ubc.ca"],
]

describe("Test", function() {

    let utils;

    before(function() {
        process.argv = ["???", "???", "./test/dummy-config.json"];
        utils = require("../app/utils");
    });

    it("Email validation", function() {
        for ([expected, emailAddress] of emailAddressTestCases) {
            assert(utils.validateEmailAddress(emailAddress) === expected);
        }
    });
});