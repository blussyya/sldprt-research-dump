# pair.sh NAME : trace SW2022 and SW2011 versions of the same controlled model and diff them
cd /home/claude/sldprt-research-dump/knowledge/evidence/scripts/EXP079
S=$(dirname "$0")/out
T="../../../../test files new"
A=$(ls -d "$T"/SW2022/$1*/ | head -1); B=$(ls -d "$T"/SW2011/$1*/ | head -1)
node fieldtrace.js "$A/model.SLDPRT" > $S/pa.txt
st=$(node probe.js "$B/model.SLDPRT" -q | grep inferred | awk '{print $4}')
START=$st node fieldtrace.js "$B/model.SLDPRT" > $S/pb.txt
python3 $S/tdiff.py $S/pa.txt $S/pb.txt > $S/pd.txt
echo "start=$st"; tail -2 $S/pb.txt | cut -c1-200
