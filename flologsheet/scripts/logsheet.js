(function () {
    'use strict';
    const logSheet = window.logSheet = {};
    const TYPE_SHEET_ENTRY = "sheet_entry";

    logSheet.init = function () {
        return new Promise((resolve, reject) => {
            floCloudAPI.requestObjectData("logSheet").then(result => {
                if (!floGlobals.appObjects.logSheet || typeof floGlobals.appObjects.logSheet !== "object")
                    floGlobals.appObjects.logSheet = {};
                if (!floGlobals.appObjects.logSheet.personDetails || typeof floGlobals.appObjects.logSheet.personDetails !== "object")
                    floGlobals.appObjects.logSheet.personDetails = {};
                if (!floGlobals.appObjects.logSheet.sheetList || typeof floGlobals.appObjects.logSheet.sheetList !== "object")
                    floGlobals.appObjects.logSheet.sheetList = {};
                resolve(result)
            }).catch(error => reject(error))
        })
    }
    logSheet.addPerson = function (floID, name, otherDetails = {}) {
        if (floGlobals.appObjects.logSheet.personDetails[floID])
            throw ("floID already exist")
        floGlobals.appObjects.logSheet.personDetails[floID] = {};
        floGlobals.appObjects.logSheet.personDetails[floID].name = name;
        for (d in otherDetails) {
            if (d === "name" || d === "floID" || !d || !otherDetails[d])
                continue;
            else
                floGlobals.appObjects.logSheet.personDetails[floID][d] = otherDetails[d]
        }
    }

    logSheet.rmPerson = function (floID) {
        if (!floGlobals.appObjects.logSheet.personDetails[floID])
            throw ("floID not found")
        delete floGlobals.appObjects.logSheet.personDetails[floID]
    }

    logSheet.editPerson = function (floID, details) {
        if (!floGlobals.appObjects.logSheet.personDetails[floID])
            throw ("floID not found")
        for (d in details) {
            if (details[d] === undefined || details[d] === null)
                delete floGlobals.appObjects.logSheet.personDetails[floID][d];
            else if (d === "floID")
                continue;
            else
                floGlobals.appObjects.logSheet.personDetails[floID][d] = details[d];
        }
    }

    logSheet.listPersons = function () {
        return floGlobals.appObjects.logSheet.personDetails
    }

    logSheet.viewPerson = function (floID) {
        if (!floGlobals.appObjects.logSheet.personDetails[floID])
            throw ("floID not found")
        return floGlobals.appObjects.logSheet.personDetails[floID]
    }

    logSheet.createNewSheet = function (title, description, attributes, editors = floGlobals.subAdmins) {
        let sheet_id = floCrypto.tmpID;
        floGlobals.appObjects.logSheet.sheetList[sheet_id] = {
            title: title,
            description: description,
            editors: editors,
            attributes: attributes
        }
        return sheet_id;
    }

    logSheet.manageSheetControl = function (sheet_id, addList, rmList) {
        if (addList === null && rmList === null) {
            floGlobals.appObjects.logSheet.sheetList[sheet_id].editors = null
            return
        }
        let editorList = floGlobals.appObjects.logSheet.sheetList[sheet_id].editors || [];
        if (Array.isArray(addList))
            addList.forEach(e => editorList.includes(e) ? null : editorList.push(e))
        if (Array.isArray(rmList))
            editorList = editorList.filter(e => !rmList.includes(e));
        floGlobals.appObjects.logSheet.sheetList[sheet_id].editors = editorList
    }

    logSheet.editSheetDescription = function (sheet_id, description) {
        floGlobals.appObjects.logSheet.sheetList[sheet_id].description = description
    }

    logSheet.listSheets = function () {
        return floGlobals.appObjects.logSheet.sheetList
    }

    logSheet.commitUpdates = function () {
        return new Promise((resolve, reject) => {
            if (!floGlobals.subAdmins.includes(floDapps.user.id))
                reject("Access Denied! only subAdmins can commit")
            floCloudAPI.updateObjectData("logSheet")
                .then(result => resolve(result))
                .catch(error => reject(error))
        })
    }

    logSheet.enterLog = function (sheet_id, floID, log) {
        return new Promise((resolve, reject) => {
            if (floGlobals.appObjects.logSheet.sheetList[sheet_id].editors) {
                // private sheet constraints
                if (!floGlobals.appObjects.logSheet.sheetList[sheet_id].editors.includes(floDapps.user.id))
                    return reject("Only editors can update logs");
                /*else if (!(floID in floGlobals.appObjects.logSheet.personDetails))
                    return reject("floID not found");*/
            } else {
                //public sheet constraint
                if (!floGlobals.subAdmins.includes(floDapps.user.id) && floID != floDapps.user.id)
                    return reject("Public authorized to log their own floID only");
            }
            floCloudAPI.sendGeneralData({
                floID,
                log
            }, TYPE_SHEET_ENTRY, {
                receiverID: sheet_id
            }).then(result => resolve(result))
                .catch(error => reject(error))
        })
    }

    logSheet.gradeLog = function (sheet_id, vc, grade) {
        return new Promise((resolve, reject) => {
            //reject if user is not subAdmin or editor
            if (!floGlobals.subAdmins.includes(floDapps.user.id) && !floGlobals.trustedIDs.includes(floDapps.user.id))
                return reject("Only subAdmins/trustedIDs can grade logs")

            let log = floGlobals.generalDataset(TYPE_SHEET_ENTRY, {
                receiverID: sheet_id
            })[vc];
            if (!log)
                return reject("Log not found");
            //else if (log.senderID === floDapps.user.id)
            //    return reject("Cannot grade own log")

            floCloudAPI.tagApplicationData(vc, grade, {
                receiverID: sheet_id
            }).then(result => resolve(result))
                .catch(error => reject(error))
        })
    }

    logSheet.refreshLogs = function (sheet_id) {
        return new Promise((resolve, reject) => {
            if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
                reject("Sheet not found")
            else {
                floCloudAPI.requestGeneralData(TYPE_SHEET_ENTRY, {
                    senderIDs: floGlobals.appObjects.logSheet.sheetList[sheet_id].editors,
                    receiverID: sheet_id
                }).then(result => resolve(result))
                    .catch(error => reject(error))
            }
        })
    }

    logSheet.viewLogs = function (sheet_id) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let sheet = [],
            vcIndex = {},
            entries = floGlobals.generalDataset(TYPE_SHEET_ENTRY, {
                receiverID: sheet_id
            }),
            editors = floGlobals.appObjects.logSheet.sheetList[sheet_id].editors;
        for (let vc in entries) {
            let l = entries[vc];
            if ((!editors && (floGlobals.subAdmins.includes(l.senderID) || l.senderID === l.message.floID)) || editors.includes(l.senderID)) {
                if (floCrypto.validateAddr(l.message.floID)) {
                    let vc = l.vectorClock
                    sheet.push({
                        vc: vc,
                        floID: l.message.floID,
                        log: l.message.log,
                        grade: l.tag
                    })
                    vcIndex[vc] = sheet.length - 1;
                }
            }
        }
        return {
            id: sheet_id,
            title: floGlobals.appObjects.logSheet.sheetList[sheet_id].title,
            description: floGlobals.appObjects.logSheet.sheetList[sheet_id].description,
            editors: floGlobals.appObjects.logSheet.sheetList[sheet_id].editors,
            attributes: floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes,
            sheet: sheet
        }
    }

    const _isNaN = value => isNaN(value) || value === '';

    const groupBy = logSheet.groupBy = {};
    groupBy.count = function (sheet_id, sheet) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let group = {};
        sheet.forEach(l => {
            if (!(l.floID in group))
                group[l.floID] = 1
            else
                group[l.floID] += 1
        })
        return group;
    }

    groupBy.total = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let group = {};
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (!(l.floID in group))
                    group[l.floID] = value
                else
                    group[l.floID] += value
            }
        })
        return group;
    }

    groupBy.avg = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let group = {};
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (!(l.floID in group))
                    group[l.floID] = {
                        total: value,
                        count: 1
                    }
                else {
                    group[l.floID].total += value
                    group[l.floID].count += 1
                }
            }
        })
        for (const floID in group)
            group[floID] = group[floID].total / group[floID].count
        return group;
    }

    groupBy.min = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let group = {};
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (!(l.floID in group))
                    group[l.floID] = value
                else if (value < group[l.floID])
                    group[l.floID] = value
            }
        })
        return group;
    }

    groupBy.max = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let group = {};
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (!(l.floID in group))
                    group[l.floID] = value
                else if (value > group[l.floID])
                    group[l.floID] = value
            }
        })
        return group;
    }

    const aggBy = logSheet.aggBy = {};
    aggBy.count = function (sheet_id, sheet) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let result = sheet.length;
        return result;
    }

    aggBy.total = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let result = 0, count = 0;
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                result += value;
                count++;
            }
        });

        if (count == 0)
            result = null;

        return result;
    }

    aggBy.avg = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let result = 0, count = 0;
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                result += value;
                count++;
            }
        })
        if (count == 0)
            result = null;
        else
            result = result / count;
        return result;
    }

    aggBy.min = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let result = null;
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (result === null || value < result)
                    result = value;
            }
        })
        return result;
    }

    aggBy.max = function (sheet_id, sheet, attribute) {
        if (!(sheet_id in floGlobals.appObjects.logSheet.sheetList))
            throw ("Sheet not found")
        let result = null;
        let attrubuteIndex = floGlobals.appObjects.logSheet.sheetList[sheet_id].attributes.indexOf(attribute)
        sheet.forEach(l => {
            if (!_isNaN(l.log[attrubuteIndex])) {
                let value = parseFloat(l.log[attrubuteIndex])
                if (result === null || value > result)
                    result = value;
            }
        })
        return result;
    }
})();