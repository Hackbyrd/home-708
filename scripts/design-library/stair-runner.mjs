export function applyStairBudget(data,runner){
 data.rows=data.rows.filter(r=>r.scope!=='stair-runner');
 if(runner.enabled===false){delete data.stairRunner;return data;}
 data.rows.push({id:'stair-runner-supply',room:'shared',category:'Owner purchases',phase:4,scope:'stair-runner',title:'Stair runner · all three interior connections',low:runner.goods[0],high:runner.goods[1],note:runner.material+' Includes carpet, underlay, binding and ordinary cutting waste. '+runner.costBasis});
 data.rows.push({id:'stair-runner-install',room:'shared',category:'Construction',phase:3,scope:'stair-runner',title:'Stair runner · templates and specialist fitting',low:runner.installationCost[0],high:runner.installationCost[1],note:runner.scope+' '+runner.installation+' Final quantities and layout follow a measured survey; direct installation before GC markup.'});
 data.stairRunner=runner;data.version='MW-B03';data.date=runner.date;
 return data;
}
