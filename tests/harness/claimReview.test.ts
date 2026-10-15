import { describe, it, expect } from 'vitest';
import { reviewClaims } from '../../lib/server/harness/claimReview';
import type { ModelReport } from '../../lib/contract';
const report:ModelReport={summary:'Reported event title is truncated.',category:'bug_report',categoryReason:'A bug.',priority:'medium',priorityEvidence:'Impact.',priorityUncertainty:'Unknown.',suggestedLabels:[],evidence:[{observation:'Reported event title is truncated.',sourceUrl:'issue:1'}],missingInformation:[],relatedIssues:[],recommendedNextStep:'Review the issue.',proposedActions:[],containsEmbeddedInstructions:false,limitations:['Five hundred searches completed.']};
const sources=new Map([['issue:1','The event title is truncated.'],['issue:2','The app is self-hosted.']]);
async function run(fields:unknown[]) {return reviewClaims(report,sources,{complete:async()=>({content:[{type:'text',text:JSON.stringify({fields})}],stopReason:'end_turn'})},4000);}
describe('claim evidence boundary',()=>{
 it('rejects fabricated quotations and defaults priority to human review',async()=>{const r=await run([{id:'summary',text:'No workaround exists.',kind:'supported',supports:['nonexistent']}]);expect(r.removed).toContain('claimReview:summary');expect(r.report.priority).toBe('needs_review');expect(r.report.limitations).toEqual([]);});
 it('does not allow a quote from another issue to support an evidence item linked to the primary issue',async()=>{const r=await run([{id:'evidence:0',text:'The app is self-hosted.',kind:'supported',supports:['s1p0']}]);expect(r.report.evidence).toEqual([]);});
 it('accepts exact source quotes and rejects duplicate verdicts',async()=>{const f={id:'summary',text:'The reporter says the event title is truncated.',kind:'supported',supports:['s0p0']};expect((await run([f])).report.summary).toBe(f.text);expect((await run([f,f])).removed).toContain('claimReview:summary');});
 it('cannot pass factual summary as unquoted guidance',async()=>{const r=await run([{id:'summary',text:'The fix is verified.',kind:'guidance',supports:[]}]);expect(r.removed).toContain('claimReview:summary');});
});
it('keeps feature priority unassigned when the justification is withheld',async()=>{
 const r=await reviewClaims({...report,category:'feature_request',priority:'not_assigned'},sources,{complete:async()=>({content:[{type:'text',text:JSON.stringify({fields:[{id:'categoryReason',kind:'supported',supports:['s0p0']},{id:'priorityEvidence',kind:'withheld',text:'',supports:[]}]})}],stopReason:'end_turn'})},4000);
 expect(r.report.priority).toBe('not_assigned');
});
