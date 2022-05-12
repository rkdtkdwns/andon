import React, {useContext, useEffect, useState} from 'react';
import {Input, Typography, Button, AutoComplete, Space, DatePicker} from 'antd';
import { makeStyles } from "@material-ui/core/styles";
import {
} from "../db_service/service";
import {fetchMachines} from "../db_service/service";
import TagDetail from "./TagDetail";

const MachineList = (props) => {
    const classes = useStyles(props);

    const urlParams = window.location.search ? (Object.fromEntries(new URLSearchParams(window.location.search)) || {}) : {};

    let [machines, setMachines] = useState([]);
    let [selected, setSelected] = useState(null);
    let [prodLine, setProdLine] = useState('');

    useEffect(()=>{
        fetchMachines().then(res=>{
            let uniqueMachine = {};
            let toShow;
            res.data.rows.forEach(e=>{
                let key = e.ProdLine + e.EquipName + e.Channel;
                if(!uniqueMachine.hasOwnProperty(key)) {
                    uniqueMachine[key] = e;
                    uniqueMachine[key].remarks = [];
                }
                uniqueMachine[key].remarks.push({name: e.TagName_S, id: e.TagIndex});
                if(urlParams.prodLine === e.ProdLine.toString() && urlParams.tagIndex === e.TagIndex.toString()){
                    toShow = Object.assign({id: e.TagIndex, name: e.TagName_S}, {machine: e})
                }

            });

            setMachines(Object.values(uniqueMachine));
            if(toShow){
                setSelected(toShow)
            }
        })
    }, []);

    let filteredMachines = [...machines].filter(e=>!prodLine || e.ProdLine.startsWith(prodLine));


    return (
        <div style={{width: '100%', maxWidth: 2000, margin: '0 auto', padding: '20px'}}>
            {selected &&
            <TagDetail
                visible={!!selected}
                onOk={()=>setSelected(null)}
                tag={selected}

            />}
            <Space direction={'horizontal'}>
                <Input
                    placeholder={'공정라인을 입력해주세요'}
                    value={prodLine}
                    onChange={e=>setProdLine(e.target.value)}
                />
            </Space>
            <div style={{marginTop: 30, display: 'flex', flexWrap: 'wrap'}}>
                {filteredMachines.map((e, i)=>(
                    <div key={i} className={classes.tag}>
                        <div>공정 라인: {e.ProdLine}</div>
                        <div>설비명: {e.EquipName}</div>
                        <div>
                            <div style={{fontSize: 12, fontWeight: 'bolder', marginTop: 5}}>설비 데이터 태그</div>
                            {e.remarks?.map((tag, i)=>(
                                <span
                                    key={i}
                                    style={{
                                        backgroundColor: ['#FAEBDD', '#FBF3DB', '#F4DFEB', '#DDEDEA', '#EAE4F2', '#DDEBF1'][i % 6],
                                        cursor: 'pointer',
                                        padding: '3px 5px',
                                        borderRadius: 3,
                                        marginRight: 5,
                                        marginBottom: 5,
                                        fontSize: 10,
                                        display: 'inline-block',
                                    }}
                                    onClick={()=>{
                                        setSelected(Object.assign({id: tag.id, name: tag.name}, {machine: e}))
                                    }}
                                >{tag.name}({tag.id})</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MachineList;


const styles = (theme) => ({
    tag: {
        width: 300,
        padding: 10,
        boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px',
        margin: '5px'
    }
});


const useStyles = makeStyles(styles);

const salesColumnType = {
    sale: '판매',
    giveaway: '증정',
    total: '합계',
};
