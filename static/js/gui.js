window.resturl = window.location.protocol+"//localhost:4001"

//if served over https, fetch over https




// navigation between steps
function advancedEnabled() {
    return $("#idAdvanced").is(':checked')
}
function scrollDiv(divid) {
    var anchor = $(divid).offset();
    window.scrollTo({
            top: anchor.top,
            left:  anchor.left,
            behavior: 'smooth'
    });
}

$("#idAdvanced").click(()=> {
    if (advancedEnabled()) {
        $("#idDivAdvanced").show()
        $("#idBtnNext1").val("Advanced")
    } else {
        $("#idDivAdvanced").hide()
        $("#idBtnNext1").val("Calculate")
    }
})



//rendering vue advanced parameters
window.advancedParameters = new Vue({
    el: '#advancedParameters',
    data: { "advancedFields": [
        {"id":"datastoreRatio","valfield": 200,"label":"Datastore Ratio"},
        {"id":"rPoolRatio","valfield": 100,"label":"Resource Pool Ratio"},
        {"id":"clusterRatio","valfield": 10,"label":"Cluster Ratio"},
        {"id":"vappRatio","valfield": 50,"label":"vApp Ratio"},
        {"id":"avNumDsOneVm","valfield": 0,"label":"Avg Number of datastore per VM"},
        {"id":"avNicsHost","valfield": 4,"label":"Avg Nics per Host"},
        {"id":"avNicsVM","valfield": 1,"label":"Avg Nics per VM"},
        {"id":"avNumVDisksVm","valfield": 3,"label":"Avg Num Virtual Disks per VM"},
        {"id":"avNumGDiskVm","valfield": 0,"label":"Avg Num Global Disks per VM"},
        {"id":"avSdPerHost","valfield": 2,"label":"Avg Sd Per Host"},
        {"id":"avSpPerHost","valfield": 2,"label":"Avg Sp Per Host"},
        {"id":"historicPerfData","valfield": 12,"label":"Historic Perf Data Months"},
        {"id":"eventsHistory","valfield": 12,"label":"Event History Data Months"},
        {"id":"vmThreshold","valfield": 1500,"label":"VM Threshold adv scaling"},
        {"id":"resourcePoolQty","valfield": 2,"label":"Resource Pool Quantity"},
        {"id":"clusterQty","valfield": 1,"label":"Cluster Quantity"},
        {"id":"vappQty","valfield": 4,"label":"vApp Quantity"},
        {"id":"datastoreQty","valfield": 1,"label":"Datastore Quantity"},
    ] },
  })

window.dbresult = new Vue({
      el: "#dbresult",
      data: {
          "sections" : [
              {
                "label": "Hypervisor Data",
                "data": {
                    "sub": [
                        {"id":"vmCap","label":"VM Data GB","val":0},
                        {"id":"hostCap","label":"Host Data GB","val":0},
                        {"id":"dataStoreCap","label":"Datastore GB","val":0},
                        {"id":"otherData","label":"Other GB","val":0},
                        {"id":"eventsData","label":"Event GB","val":0},
                      ],
                  }
              },
              {
                "label": "Backup Data",
                "data": {
                    "sub": [
                      {"id":"vbrPerfData","label":"Performance GB","val":0},
                      {"id":"vbrEventsData","label":"Event GB","val":0},
                      {"id":"vbrDbTimeData","label":"Historic Time Data GB","val":0},
                    ],
                }
            },
            {
                "label": "Total",
                "data": {
                    "sub": [],
                    "total": {
                      "id":"totalCap","label":"Database Size (1.2x)","val":0,
                    }
                }
            }
          ]
          
      }
})


//calculate
function downloadDB() {
    ln = []
    window.dbresult.sections.forEach(section => {
        ln.push(section.label)
        section.data.sub.forEach(e => {
            ln.push([e.label,e.val].join("\t"))
        })
        if (section.data.total !== undefined) {
            ln.push([section.data.total.label,section.data.total.val].join("\t"))
        }
        ln.push("")
    });
    $('#dbdownload').prop("href","data:text/plain,"+encodeURI(ln.join("\n")))
}
function recalculateResult(advanced=false) {
    console.log("recalculating")

    var calcurl = window.resturl+"/SimpleCal"
    var dataIn = {
        "vmQty": $("#idVM").val(),
        "hostQty": $("#idHost").val()
    }
    if (advanced) {
        advparams = {}
        window.advancedParameters.advancedFields.forEach(p => {
            advparams[p.id] = parseInt(p.valfield)
        });
        dataIn["settings"] = advparams
        calcurl = window.resturl+"/AdvancedCal"
    }

    const u = "Updating ..."
    window.dbresult.sections.forEach(section => {
        section.data.sub.forEach(sub => {
            sub.val = u
        });
        if(section.data.total !== undefined) {
            section.data.total.val = u
        }
    });

    $("#idBtnNext1").prop('disabled', true);
    $("#idBtnNext2").prop('disabled', true);

    fetch(calcurl, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json'
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(dataIn) // body data type must match "Content-Type" header
    }).then(response => response.json()).then(data => {
        const fnRound = (text) => Math.round((parseFloat(text)*100))/100

        window.dbresult.sections.forEach(section => {
            section.data.sub.forEach(sub => {
                if (sub.id in data) {
                    sub.val = fnRound(data[sub.id])
                }
            });
            if(section.data.total !== undefined) {
                const totalid = section.data.total.id
                if (totalid in data) {
                    section.data.total.val = fnRound(data[totalid])
                }
            }
        });
        downloadDB()
        scrollDiv("#idDivResult")
        
    }).catch((error) => {
        console.error('Error:', error);
        $('#modalerrortext').html("<p>Issue while fetching result from the server, please retry.</p><p>If the issue persists, the backend might be experiencing issues</p><p>"+error+"</p>")
        $('#modalerror').modal('show')
        window.dbresult.sections.forEach(section => {
            section.data.sub.forEach(sub => {
                sub.val = 0
            });
            if(section.data.total !== undefined) {
                section.data.total.val = 0
            }
        });
    }).finally(()=> {
        $("#idBtnNext1").prop('disabled', false);
        $("#idBtnNext2").prop('disabled', false);
    })


    
}


$("#idBtnNext1").click(function() {
    if (advancedEnabled()) {
        scrollDiv("#idDivAdvanced")
    } else {
        //if not advanced, calculate the result
        recalculateResult(false)
    }
    
    
    return false  
})

$("#idBtnNext2").click(function() {
    var anchor = "#idDivResult"
    recalculateResult(true)
    return false  
})





$( document ).ready(function(){
    const search = window.location.search 
    const advregex = /enableAdvanced/g;
    if ( advregex.test(search) ) {
        $("#idAdvanced").prop( "checked", true );
        $("#idDivAdvanced").show()
    }
})

